pragma solidity 0.8.28;

/**
 * @title IIntentSource
 * @notice Interface for the source chain component of an intent-based bridging protocol.
 */
interface IIntentSource {
    struct Intent {
        address user;
        address sourceAsset;
        uint256 amount;
        uint256 destChainId;
        address destRecipient;
        address destAsset;
        uint256 minDestAmount; // Minimum amount to receive on destination chain
        uint256 nonce;
        uint256 deadline;
        bytes extraData; // For future-proofing
    }

    event IntentLocked(bytes32 indexed intentHash, Intent intent);
    event IntentSettled(bytes32 indexed intentHash, address indexed solver);
    event IntentRefunded(bytes32 indexed intentHash);

    /**
     * @notice Locks assets and registers a signed intent.
     * @param intent The intent details.
     * @param signature The EIP-712 signature from the user.
     */
    function lockIntent(
        Intent calldata intent,
        bytes calldata signature
    ) external payable;

    /**
     * @notice Settles an intent by providing proof of fulfillment on the destination chain.
     * @param intent The original intent.
     * @param proof The proof of settlement (e.g., XCM message receipt, state proof).
     */
    function settleIntent(
        Intent calldata intent,
        bytes calldata proof
    ) external;

    /**
     * @notice Refunds the user if the intent has expired without fulfillment.
     * @param intent The original intent.
     */
    function refundIntent(Intent calldata intent) external;
}
