// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IIntentSource} from "./IIntentSource.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {LibScale} from "./LibScale.sol";

/**
 * @title IntentExecutor
 * @notice Singleton hub for intent-based settlement with PolkaVM validation hooks.
 */
contract IntentExecutor is
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
            "Intent(address user,address sourceAsset,uint256 amount,uint256 destChainId,address destRecipient,address destAsset,uint256 minDestAmount,uint256 nonce,uint256 deadline,bytes extraData)"
        );

    uint256 public constant CHALLENGE_PERIOD = 24 hours;
    uint256 public constant MIN_SOLVER_BOND = 10 ether;
    uint256 public constant MAX_FEE_BPS = 500;

    address public treasury;
    address public bondToken;
    address public verifier; // PolkaVM Verifier Address
    address public tokenFactory; // Authorized Token Factory
    uint256 public feeBps = 50;

    mapping(bytes32 => bool) public registeredIntents;
    mapping(bytes32 => bool) public settledIntents;
    mapping(bytes32 => bool) public refundedIntents;
    mapping(address => uint256) public nonces;
    mapping(address => bool) public whitelistedTokens;
    mapping(address => uint256) public solverBonds;
    mapping(bytes32 => address) public intentSolvers;
    mapping(bytes32 => uint256) public settlementTimestamp;
    mapping(bytes32 => uint256) public snapshotFeeBps;
    mapping(uint256 => bytes32) public canonicalStateRoots; // ChainId => Root
    mapping(address => uint256) public latestSettlementChallengeEnd;

    event TokenWhitelisted(address indexed token, bool status);
    event VerifierUpdated(address indexed newVerifier);
    event TokenFactoryUpdated(address indexed newTokenFactory);
    event IntentChallenged(
        bytes32 indexed intentHash,
        address indexed solver,
        string reason
    );
    event StateRootUpdated(uint256 indexed chainId, bytes32 newRoot);

    modifier onlyWhitelistedToken(address token) {
        require(whitelistedTokens[token], "Executor: token not whitelisted");
        _;
    }

    modifier onlyOwnerOrFactory() {
        require(
            msg.sender == owner() || msg.sender == tokenFactory,
            "Executor: unauthorized"
        );
        _;
    }

    constructor(
        address _treasury,
        address _bondToken
    ) EIP712("PolkadotIntentProtocol", "1.0.0") {
        require(_treasury != address(0), "Executor: zero treasury");
        require(_bondToken != address(0), "Executor: zero bond token");
        treasury = _treasury;
        bondToken = _bondToken;
    }

    function whitelistToken(
        address token,
        bool status
    ) external onlyOwnerOrFactory {
        whitelistedTokens[token] = status;
        emit TokenWhitelisted(token, status);
    }

    function setVerifier(address _verifier) external onlyOwner {
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    function setTokenFactory(address _tokenFactory) external onlyOwner {
        tokenFactory = _tokenFactory;
        emit TokenFactoryUpdated(_tokenFactory);
    }

    function updateStateRoot(uint256 chainId, bytes32 root) external onlyOwner {
        canonicalStateRoots[chainId] = root;
        emit StateRootUpdated(chainId, root);
    }

    function depositBond(uint256 amount) external nonReentrant {
        require(amount >= MIN_SOLVER_BOND, "Executor: insufficient bond");
        IERC20(bondToken).safeTransferFrom(msg.sender, address(this), amount);
        solverBonds[msg.sender] += amount;
    }

    function withdrawBond(uint256 amount) external nonReentrant {
        require(
            solverBonds[msg.sender] >= amount,
            "Executor: insufficient balance"
        );
        require(
            block.timestamp > latestSettlementChallengeEnd[msg.sender],
            "Executor: bond locked during challenge window"
        );
        solverBonds[msg.sender] -= amount;
        IERC20(bondToken).safeTransfer(msg.sender, amount);
    }

    function lockIntent(
        Intent calldata intent,
        bytes calldata signature
    )
        external
        payable
        override
        nonReentrant
        whenNotPaused
        onlyWhitelistedToken(intent.sourceAsset)
        onlyWhitelistedToken(intent.destAsset)
    {
        require(intent.deadline > block.timestamp, "Executor: expired");
        require(intent.nonce == nonces[intent.user], "Executor: invalid nonce");

        bytes32 structHash = keccak256(
            abi.encode(
                INTENT_TYPEHASH,
                intent.user,
                intent.sourceAsset,
                intent.amount,
                intent.destChainId,
                intent.destRecipient,
                intent.destAsset,
                intent.minDestAmount,
                intent.nonce,
                intent.deadline,
                keccak256(intent.extraData)
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(signer == intent.user, "Executor: invalid signature");

        if (intent.sourceAsset == address(0)) {
            require(
                msg.sender == intent.user,
                "Executor: native ETH requires user sender"
            );
            require(
                msg.value == intent.amount,
                "Executor: native amount mismatch"
            );
        } else {
            require(msg.value == 0, "Executor: expected native 0");
            IERC20(intent.sourceAsset).safeTransferFrom(
                intent.user,
                address(this),
                intent.amount
            );
        }

        // @dev PolkaVM price verification hook
        if (verifier != address(0)) {
            bytes memory priceCheck = abi.encodePacked(
                LibScale.encodeU32(uint32(uint160(intent.sourceAsset))),
                LibScale.encodeU32(uint32(uint160(intent.destAsset))),
                LibScale.encodeU128(uint128(intent.amount)),
                LibScale.encodeU128(uint128(intent.minDestAmount))
            );

            (bool success, bytes memory result) = verifier.staticcall(
                abi.encodePacked(uint32(0x311ebad9), priceCheck)
            );
            require(
                success && result.length > 0 && result[0] != 0,
                "Executor: PVM price check failed"
            );
        }

        registeredIntents[hash] = true;
        snapshotFeeBps[hash] = feeBps;
        nonces[intent.user]++;

        emit IntentLocked(hash, intent);
    }

    function settleIntent(
        Intent calldata intent,
        bytes calldata proof
    ) external override nonReentrant {
        require(
            solverBonds[msg.sender] >= MIN_SOLVER_BOND,
            "Executor: bond required"
        );
        bytes32 intentHash = _getIntentHash(intent);

        require(registeredIntents[intentHash], "Executor: not found");
        require(!settledIntents[intentHash], "Executor: settled");

        // @dev PolkaVM settlement verification hook
        if (verifier != address(0)) {
            bytes32 root = canonicalStateRoots[intent.destChainId];
            require(root != bytes32(0), "Executor: no root for chain");

            // @dev Append canonical state root to tightly-packed SCALE proof
            bytes memory payload = abi.encodePacked(proof, root);

            (bool success, bytes memory result) = verifier.staticcall(
                abi.encodePacked(uint32(0xdc7f7de6), payload)
            );
            require(
                success && result.length > 0 && result[0] != 0,
                "Executor: PVM validation failed"
            );
        }

        settledIntents[intentHash] = true;
        settlementTimestamp[intentHash] = block.timestamp;
        intentSolvers[intentHash] = msg.sender;
        latestSettlementChallengeEnd[msg.sender] =
            block.timestamp +
            CHALLENGE_PERIOD;

        emit IntentSettled(intentHash, msg.sender);
    }

    function challengeSettlement(
        bytes32 intentHash,
        string calldata reason
    ) external onlyOwner {
        require(settledIntents[intentHash], "Executor: not settled");
        require(
            block.timestamp <=
                settlementTimestamp[intentHash] + CHALLENGE_PERIOD,
            "Executor: challenge period expired"
        );
        address solver = intentSolvers[intentHash];

        _slashSolver(solver, MIN_SOLVER_BOND);

        settledIntents[intentHash] = false;
        registeredIntents[intentHash] = true;

        emit IntentChallenged(intentHash, solver, reason);
    }

    function _slashSolver(address solver, uint256 amount) internal {
        uint256 balance = solverBonds[solver];
        uint256 toSlash = amount > balance ? balance : amount;

        solverBonds[solver] -= toSlash;
        IERC20(bondToken).safeTransfer(treasury, toSlash);
    }

    function finalizeIntent(Intent calldata intent) external nonReentrant {
        bytes32 intentHash = _getIntentHash(intent);
        require(settledIntents[intentHash], "Executor: not settled");
        require(
            block.timestamp >
                settlementTimestamp[intentHash] + CHALLENGE_PERIOD,
            "Executor: challenge active"
        );

        uint256 fee = (intent.amount * snapshotFeeBps[intentHash]) / 10000;
        uint256 solverAmount = intent.amount - fee;

        if (fee > 0) {
            if (intent.sourceAsset == address(0)) {
                (bool success, ) = treasury.call{value: fee}("");
                require(success, "Executor: fee transfer failed");
            } else {
                IERC20(intent.sourceAsset).safeTransfer(treasury, fee);
            }
        }

        address solver = intentSolvers[intentHash];
        if (intent.sourceAsset == address(0)) {
            (bool success, ) = solver.call{value: solverAmount}("");
            require(success, "Executor: solver transfer failed");
        } else {
            IERC20(intent.sourceAsset).safeTransfer(solver, solverAmount);
        }
    }

    function refundIntent(
        Intent calldata intent
    ) external override nonReentrant {
        require(block.timestamp > intent.deadline, "Executor: not expired");
        bytes32 intentHash = _getIntentHash(intent);
        require(
            registeredIntents[intentHash] &&
                !settledIntents[intentHash] &&
                !refundedIntents[intentHash],
            "Executor: invalid state"
        );

        refundedIntents[intentHash] = true;
        if (intent.sourceAsset == address(0)) {
            (bool success, ) = intent.user.call{value: intent.amount}("");
            require(success, "Executor: refund transfer failed");
        } else {
            IERC20(intent.sourceAsset).safeTransfer(intent.user, intent.amount);
        }
        emit IntentRefunded(intentHash);
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
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
                        intent.minDestAmount,
                        intent.nonce,
                        intent.deadline,
                        keccak256(intent.extraData)
                    )
                )
            );
    }
}
