// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library LibScale {
    function encodeUint32LE(uint32 value) internal pure returns (bytes memory) {
        bytes memory b = new bytes(4);
        b[0] = bytes1(uint8(value));
        b[1] = bytes1(uint8(value >> 8));
        b[2] = bytes1(uint8(value >> 16));
        b[3] = bytes1(uint8(value >> 24));
        return b;
    }

    function encodeUint64LE(uint64 value) internal pure returns (bytes memory) {
        bytes memory b = new bytes(8);
        for (uint256 i = 0; i < 8; i++) {
            b[i] = bytes1(uint8(value >> (i * 8)));
        }
        return b;
    }

    function encodeBytes(
        bytes memory data
    ) internal pure returns (bytes memory) {
        uint256 len = data.length;
        bytes memory prefix;

        if (len < 64) {
            prefix = new bytes(1);
            prefix[0] = bytes1(uint8(len << 2));
        } else if (len < 16384) {
            prefix = new bytes(2);
            uint16 encoded = uint16((len << 2) | 0x01);
            prefix[0] = bytes1(uint8(encoded));
            prefix[1] = bytes1(uint8(encoded >> 8));
        } else {
            revert("LibScale: unsupported length");
        }

        return abi.encodePacked(prefix, data);
    }
}
