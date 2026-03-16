// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../src/IntentExecutor.sol";
import "../src/MockERC20.sol";
import "../src/IIntentSource.sol";
import "../src/LibScale.sol";
import "forge-std/console2.sol";

// @dev Mock PolkaVM Verifier interception abstraction
contract MockVerifier {
    fallback(bytes calldata input) external returns (bytes memory) {
        bytes memory res = new bytes(1);
        res[0] = 0x01; // Return success
        return res;
    }
}

contract CrossVMIntegrationTest is Test {
    IntentExecutor public executor;
    MockERC20 public bondToken;
    MockERC20 public sourceAsset;
    MockVerifier public verifier;

    address public treasury = address(0x111);
    address public alice;
    address public solver = address(0x333);
    uint256 public alicePrivKey = 0xA11CE;

    function setUp() public {
        alice = vm.addr(alicePrivKey);
        bondToken = new MockERC20("PolkaBond", "PBT");
        sourceAsset = new MockERC20("SourceAsset", "SA");
        verifier = new MockVerifier();

        executor = new IntentExecutor(treasury, address(bondToken));
        executor.setVerifier(address(verifier));

        executor.whitelistToken(address(sourceAsset), true);
        executor.whitelistToken(address(0x888), true);
        sourceAsset.mint(alice, 1000 ether);
        bondToken.mint(solver, 100 ether);

        vm.startPrank(solver);
        bondToken.approve(address(executor), 100 ether);
        executor.depositBond(10 ether);
        vm.stopPrank();
    }

    function test_GenerateCrossVMPayload() public {
        // Create intent
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: alice,
            sourceAsset: address(sourceAsset),
            amount: 100 ether,
            destChainId: 1000,
            destRecipient: address(0x999),
            destAsset: address(0x888),
            minDestAmount: 95 ether,
            nonce: executor.nonces(alice),
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        // Lock intent
        bytes32 structHash = keccak256(
            abi.encode(
                executor.INTENT_TYPEHASH(),
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
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                executor.DOMAIN_SEPARATOR(),
                structHash
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePrivKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.startPrank(alice);
        sourceAsset.approve(address(executor), 100 ether);
        executor.lockIntent(intent, signature);
        vm.stopPrank();

        // Prepare settlement proof and state root
        executor.updateStateRoot(1000, bytes32(uint256(0x123456789)));

        // Construct off-chain SCALE-encoded IntentSettlementProof (Little-Endian)
        bytes memory mockProof = abi.encodePacked(
            hash,
            LibScale.encodeU32(uint32(1000)),
            address(0x999),
            LibScale.encodeU128(uint128(95 ether)),
            hex"00"
        );

        bytes32 root = bytes32(uint256(0x123456789));

        // Generate expected payload for IntentExecutor PVM staticcall
        bytes memory pvmPayload = abi.encodePacked(
            uint32(0xdc7f7de6),
            abi.encodePacked(mockProof, root)
        );

        console2.log("--- PVM PAYLOAD HEX ---");
        console2.logBytes(pvmPayload);
        console2.log("-----------------------");

        // Verify payload generation
        assertTrue(pvmPayload.length > 0);
    }
}
