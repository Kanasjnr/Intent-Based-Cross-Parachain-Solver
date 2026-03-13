// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IIntentSource} from "./IIntentSource.sol";
import {IXcm, XCM_PRECOMPILE_ADDRESS} from "./IXcm.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {LibScale} from "./LibScale.sol";

/**
 * @title IntentSourceVault
 * @notice Vault for cross-chain intent settlement with optimistic verification.
 */
contract IntentSourceVault is
    IIntentSource,
    EIP712,
    ReentrancyGuard,
    Ownable,
    Pausable
{
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    bytes32 public constant INTENT_TYPEHASH =
        keccak256(
            "Intent(address user,address sourceAsset,uint256 amount,uint256 destChainId,address destRecipient,address destAsset,uint256 nonce,uint256 deadline,bytes extraData)"
        );

    uint256 public constant CHALLENGE_PERIOD = 24 hours;
    uint256 public constant MIN_SOLVER_BOND = 10 ether;
    uint256 public constant MAX_FEE_BPS = 500;

    address public treasury;
    address public bondToken;
    uint256 public feeBps = 50;
    bool public xcmEnabled = true;

    mapping(bytes32 => bool) public registeredIntents;
    mapping(bytes32 => bool) public settledIntents;
    mapping(bytes32 => bool) public refundedIntents;
    mapping(address => uint256) public nonces;
    mapping(address => bool) public whitelistedSolvers;
    mapping(address => uint256) public solverReputation;
    mapping(bytes32 => uint256) public settlementTimestamp;
    mapping(bytes32 => address) public intentSolvers;
    mapping(address => uint256) public solverBonds;
    mapping(address => uint256) public latestSettlementChallengeEnd;

    event SolverWhitelisted(address indexed solver, bool status);
    event FeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address indexed newTreasury);

    modifier onlyWhitelistedSolver() {
        require(whitelistedSolvers[msg.sender], "Vault: unauthorized solver");
        _;
    }

    constructor(
        address _treasury,
        address _bondToken
    ) EIP712("PolkadotIntentProtocol", "1.0.0") {
        require(_treasury != address(0), "Vault: zero treasury");
        require(_bondToken != address(0), "Vault: zero bond token");
        treasury = _treasury;
        bondToken = _bondToken;
    }

    function setXcmEnabled(bool enabled) external onlyOwner {
        xcmEnabled = enabled;
    }

    function setSolverWhitelist(
        address solver,
        bool status
    ) external onlyOwner {
        whitelistedSolvers[solver] = status;
        emit SolverWhitelisted(solver, status);
    }

    function setFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Vault: fee too high");
        feeBps = _feeBps;
        emit FeeUpdated(_feeBps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Vault: zero treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function rescueToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(token != bondToken, "Vault: bond token protected");
        IERC20(token).safeTransfer(to, amount);
    }

    function depositBond(uint256 amount) external nonReentrant {
        require(amount >= MIN_SOLVER_BOND, "Vault: insufficient bond amount");
        IERC20(bondToken).safeTransferFrom(msg.sender, address(this), amount);
        solverBonds[msg.sender] += amount;
    }

    function withdrawBond(uint256 amount) external nonReentrant {
        require(
            block.timestamp > latestSettlementChallengeEnd[msg.sender],
            "Vault: bond locked for challenge"
        );
        require(
            solverBonds[msg.sender] >= amount,
            "Vault: insufficient balance"
        );
        solverBonds[msg.sender] -= amount;
        IERC20(bondToken).safeTransfer(msg.sender, amount);
    }

    function lockIntent(
        Intent calldata intent,
        bytes calldata signature
    ) external override nonReentrant whenNotPaused {
        require(intent.user == msg.sender, "Vault: user mismatch");
        require(intent.deadline > block.timestamp, "Vault: intent expired");
        require(intent.nonce == nonces[msg.sender], "Vault: invalid nonce");

        bytes32 structHash = keccak256(
            abi.encode(
                INTENT_TYPEHASH,
                intent.user,
                intent.sourceAsset,
                intent.amount,
                intent.destChainId,
                intent.destRecipient,
                intent.destAsset,
                intent.nonce,
                intent.deadline,
                keccak256(intent.extraData)
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(signer == intent.user, "Vault: invalid signature");

        IERC20(intent.sourceAsset).safeTransferFrom(
            intent.user,
            address(this),
            intent.amount
        );

        registeredIntents[hash] = true;
        nonces[msg.sender]++;

        emit IntentLocked(hash, intent);

        if (xcmEnabled) {
            _notifyDestination(intent, hash);
        }
    }

    function settleIntent(
        Intent calldata intent,
        bytes calldata proof
    ) external override onlyWhitelistedSolver nonReentrant {
        require(
            solverBonds[msg.sender] >= MIN_SOLVER_BOND,
            "Vault: solver bond required"
        );
        bytes32 intentHash = _getIntentHash(intent);

        require(registeredIntents[intentHash], "Vault: intent not found");
        require(!settledIntents[intentHash], "Vault: already settled");
        require(!refundedIntents[intentHash], "Vault: already refunded");

        _verifyFulfillmentProof(intentHash, proof);

        settledIntents[intentHash] = true;
        settlementTimestamp[intentHash] = block.timestamp;
        intentSolvers[intentHash] = msg.sender;
        latestSettlementChallengeEnd[msg.sender] =
            block.timestamp +
            CHALLENGE_PERIOD;

        emit IntentSettled(intentHash, msg.sender);
    }

    function finalizeIntent(Intent calldata intent) external nonReentrant {
        bytes32 intentHash = _getIntentHash(intent);
        require(settledIntents[intentHash], "Vault: not settled");
        require(
            block.timestamp >
                settlementTimestamp[intentHash] + CHALLENGE_PERIOD,
            "Vault: challenge active"
        );

        uint256 fee = (intent.amount * feeBps) / 10000;
        uint256 solverAmount = intent.amount - fee;

        if (fee > 0) {
            IERC20(intent.sourceAsset).safeTransfer(treasury, fee);
        }

        address solver = intentSolvers[intentHash];
        IERC20(intent.sourceAsset).safeTransfer(solver, solverAmount);
        solverReputation[solver]++;
    }

    function challengeIntent(
        Intent calldata intent,
        bytes calldata evidence
    ) external nonReentrant {
        // Implementation for fraud proof validation
    }

    function refundIntent(
        Intent calldata intent
    ) external override nonReentrant {
        require(
            block.timestamp > intent.deadline,
            "Vault: deadline not reached"
        );
        bytes32 intentHash = _getIntentHash(intent);

        require(registeredIntents[intentHash], "Vault: intent not found");
        require(!settledIntents[intentHash], "Vault: already settled");
        require(!refundedIntents[intentHash], "Vault: already refunded");

        refundedIntents[intentHash] = true;
        IERC20(intent.sourceAsset).safeTransfer(intent.user, intent.amount);

        emit IntentRefunded(intentHash);
    }

    function domainSeparator() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _getIntentHash(
        Intent calldata intent
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        INTENT_TYPEHASH,
                        intent.user,
                        intent.sourceAsset,
                        intent.amount,
                        intent.destChainId,
                        intent.destRecipient,
                        intent.destAsset,
                        intent.nonce,
                        intent.deadline,
                        keccak256(intent.extraData)
                    )
                )
            );
    }

    function _notifyDestination(
        Intent calldata intent,
        bytes32 intentHash
    ) internal {
        if (intent.destChainId == 0) return;

        bytes memory destination = abi.encodePacked(
            uint8(1),
            uint8(1),
            uint8(0),
            LibScale.encodeUint32LE(uint32(intent.destChainId))
        );

        bytes memory payload = abi.encode(
            intentHash,
            intent.user,
            intent.amount
        );
        bytes memory xcmMessage = LibScale.encodeBytes(payload);

        try
            IXcm(XCM_PRECOMPILE_ADDRESS).send(destination, xcmMessage)
        {} catch {}
    }

    function _verifyFulfillmentProof(
        bytes32,
        bytes calldata proof
    ) internal virtual {
        require(proof.length > 0, "Vault: proof required");
    }
}
