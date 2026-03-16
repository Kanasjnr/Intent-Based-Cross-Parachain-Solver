// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVerifier
 * @notice Interface for the PolkaVM Settlement Verifier.
 */
interface IVerifier {
    /**
     * @notice Verify a cross-chain settlement proof.
     * @param proof SCALE-encoded proof data.
     * @return success True if verification passed.
     */
    function verify_settlement(
        bytes calldata proof
    ) external view returns (bool success);

    /**
     * @notice Verify an intent price against an oracle.
     * @param check Packed price data (Assets and Amounts).
     * @return success True if price is within fair range.
     */
    function verify_price(
        bytes calldata check
    ) external view returns (bool success);
}
