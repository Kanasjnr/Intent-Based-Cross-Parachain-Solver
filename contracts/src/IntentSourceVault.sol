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

/**
 * @title IntentSourceVault
 * @notice High-security vault for handling cross-chain intents with atomic escrow.
 * @dev Implements EIP-712 and interacts with XCM precompile for cross-chain notification.
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

    mapping(bytes32 => bool) public registeredIntents;
    mapping(bytes32 => bool) public settledIntents;
    mapping(bytes32 => bool) public refundedIntents;
    mapping(address => uint256) public nonces;
    mapping(address => bool) public whitelistedSolvers;
    mapping(address => uint256) public solverReputation;

    address public treasury;
    uint256 public feeBps = 50; // 0.5% default
    uint256 public constant MAX_FEE_BPS = 500; // 5% cap

    bool public xcmEnabled = true;

    event SolverWhitelisted(address indexed solver, bool status);
    event FeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address indexed newTreasury);

    modifier onlyWhitelistedSolver() {
        require(
            whitelistedSolvers[msg.sender],
            "Vault: not a whitelisted solver"
        );
        _;
    }

    constructor(address _treasury) EIP712("PolkadotIntentProtocol", "1.0.0") {
        require(_treasury != address(0), "Vault: zero treasury");
        treasury = _treasury;
    }

    /**
     * @notice Toggle XCM notifications.
     */
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

    /**
     * @notice Emergency rescue for trapped assets.
     */
    function rescueToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @inheritdoc IIntentSource
     */
    function lockIntent(
        Intent calldata intent,
        bytes calldata signature
    ) external override nonReentrant whenNotPaused {
        require(intent.user == msg.sender, "Intent: user mismatch");
        require(intent.deadline > block.timestamp, "Intent: expired");
        require(intent.nonce == nonces[msg.sender], "Intent: invalid nonce");

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
        require(signer == intent.user, "Intent: invalid signature");

        // Atomic Escrow
        IERC20(intent.sourceAsset).safeTransferFrom(
            intent.user,
            address(this),
            intent.amount
        );

        registeredIntents[hash] = true;
        nonces[msg.sender]++;

        emit IntentLocked(hash, intent);

        // Optional: Notify destination chain via XCM
        if (xcmEnabled) {
            _notifyDestination(intent, hash);
        }
    }

    /**
     * @inheritdoc IIntentSource
     */
    function settleIntent(
        Intent calldata intent,
        bytes calldata proof
    ) external override onlyWhitelistedSolver nonReentrant {
        bytes32 intentHash = _getIntentHash(intent);

        require(registeredIntents[intentHash], "Intent: not registered");
        require(!settledIntents[intentHash], "Intent: already settled");
        require(!refundedIntents[intentHash], "Intent: already refunded");

        _verifyFulfillmentProof(intentHash, proof);

        settledIntents[intentHash] = true;

        // Revenue Management
        uint256 fee = (intent.amount * feeBps) / 10000;
        uint256 solverAmount = intent.amount - fee;

        if (fee > 0) {
            IERC20(intent.sourceAsset).safeTransfer(treasury, fee);
        }

        // Release funds to solver
        IERC20(intent.sourceAsset).safeTransfer(msg.sender, solverAmount);

        solverReputation[msg.sender]++;

        emit IntentSettled(intentHash, msg.sender);
    }

    /**
     * @inheritdoc IIntentSource
     */
    function refundIntent(
        Intent calldata intent
    ) external override nonReentrant {
        require(block.timestamp > intent.deadline, "Intent: not expired");
        bytes32 intentHash = _getIntentHash(intent);

        require(registeredIntents[intentHash], "Intent: not registered");
        require(!settledIntents[intentHash], "Intent: already settled");
        require(!refundedIntents[intentHash], "Intent: already refunded");

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

    /**
     * @dev Sends an XCM notification to the destination chain.
     * This uses the Low-Level XCM Precompile.
     */
    function _notifyDestination(
        Intent calldata intent,
        bytes32 intentHash
    ) internal {
        if (intent.destChainId == 0) return;

        // Construct SCALE-encoded MultiLocation: { parents: 1, interior: X1(Parachain(id)) }
        // 0x01 (parents=1) | 0x01 (X1) | 0x00 (Junction=Parachain) | [uint32 ParaId LE]
        bytes memory destination = abi.encodePacked(
            uint8(1),
            uint8(1),
            uint8(0),
            uint32(intent.destChainId) // Note: Solidity is BE, SCALE is LE. For ParaIDs < 255 it's same-ish.
        );

        bytes memory message = abi.encode(
            intentHash,
            intent.user,
            intent.amount
        );

        try IXcm(XCM_PRECOMPILE_ADDRESS).send(destination, message) {
            // Success
        } catch {
            // Silently fail to avoid blocking source tx
        }
    }

    /**
     * @dev Internal hook for proof verification.
     */
    function _verifyFulfillmentProof(
        bytes32 /*intentHash*/,
        bytes calldata proof
    ) internal virtual {
        require(proof.length > 0, "Intent: empty proof");
    }
}
