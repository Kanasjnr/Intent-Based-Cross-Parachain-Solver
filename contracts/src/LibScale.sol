// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title LibScale
 * @notice Lightweight encoding library for serializing Solidity types into Polkadot's SCALE codec (Little-Endian).
 */
library LibScale {
    function encodeU32(uint32 value) internal pure returns (bytes memory) {
        bytes memory result = new bytes(4);
        result[0] = bytes1(uint8(value));
        result[1] = bytes1(uint8(value >> 8));
        result[2] = bytes1(uint8(value >> 16));
        result[3] = bytes1(uint8(value >> 24));
        return result;
    }

    function encodeU128(uint128 value) internal pure returns (bytes memory) {
        bytes memory result = new bytes(16);
        for (uint i = 0; i < 16; i++) {
            result[i] = bytes1(uint8(value >> (i * 8)));
        }
        return result;
    }
}
