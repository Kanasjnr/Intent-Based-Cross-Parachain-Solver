// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev The on-chain address of the XCM (Cross-Consensus Messaging) precompile.
address constant XCM_PRECOMPILE_ADDRESS = address(0xA0000);

/// @title XCM Precompile Interface
/// @notice A low-level interface for interacting with `pallet_xcm`.
interface IXcm {
    /// @notice Weight v2 used for measurement for an XCM execution
    struct Weight {
        uint64 refTime;
        uint64 proofSize;
    }

    function execute(bytes calldata message, Weight calldata weight) external;
    function send(bytes calldata destination, bytes calldata message) external;
    function weighMessage(bytes calldata message) external view returns (Weight memory weight);
}
