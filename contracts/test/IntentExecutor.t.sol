// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../src/IntentExecutor.sol";
import "../src/MockERC20.sol";
import "../src/IIntentSource.sol";
import "forge-std/console2.sol";

contract MockVerifier {
    bool public shouldSucceed = true;

    function setShouldSucceed(bool _shouldSucceed) external {
        shouldSucceed = _shouldSucceed;
    }

    fallback(bytes calldata input) external returns (bytes memory) {
        if (shouldSucceed) {
            bytes memory res = new bytes(1);
            res[0] = 0x01;
            return res;
        } else {
            bytes memory res = new bytes(1);
            res[0] = 0x00;
            return res;
        }
    }
}

contract IntentExecutorTest is Test {
    IntentExecutor public executor;
    MockERC20 public bondToken;
    MockERC20 public sourceAsset;
    MockERC20 public destAsset;
    MockVerifier public verifier;

    address public treasury = address(0x111);
    address public alice;
    address public solver = address(0x333);
    uint256 public alicePrivKey = 0xA11CE;

    function setUp() public {
        alice = vm.addr(alicePrivKey);
        bondToken = new MockERC20("PolkaBond", "PBT");
        sourceAsset = new MockERC20("SourceAsset", "SA");
        destAsset = new MockERC20("DestAsset", "DA");
        verifier = new MockVerifier();

        executor = new IntentExecutor(treasury, address(bondToken));
        executor.setVerifier(address(verifier));

        executor.whitelistToken(address(sourceAsset), true);
        executor.whitelistToken(address(destAsset), true);
        executor.whitelistToken(address(0), true);

        sourceAsset.mint(alice, 1000 ether);
        bondToken.mint(solver, 100 ether);

        vm.startPrank(solver);
        bondToken.approve(address(executor), 100 ether);
        executor.depositBond(10 ether);
        vm.stopPrank();
    }

    function test_LockIntent_ERC20() public {
        IIntentSource.Intent memory intent = _createIntent(
            address(sourceAsset),
            100 ether
        );
        bytes memory signature = _signIntent(intent, alicePrivKey);

        vm.startPrank(alice);
        sourceAsset.approve(address(executor), 100 ether);
        executor.lockIntent(intent, signature);
        vm.stopPrank();

        assertTrue(executor.registeredIntents(_getIntentHash(intent)));
    }

    function test_LockIntent_Native() public {
        IIntentSource.Intent memory intent = _createIntent(address(0), 1 ether);
        bytes memory signature = _signIntent(intent, alicePrivKey);

        vm.deal(alice, 10 ether);
        vm.startPrank(alice);
        executor.lockIntent{value: 1 ether}(intent, signature);
        vm.stopPrank();

        assertTrue(executor.registeredIntents(_getIntentHash(intent)));
    }

    function test_SettleIntent() public {
        IIntentSource.Intent memory intent = _createIntent(
            address(sourceAsset),
            100 ether
        );

        vm.startPrank(alice);
        sourceAsset.approve(address(executor), 100 ether);
        executor.lockIntent(intent, _signIntent(intent, alicePrivKey));
        vm.stopPrank();

        executor.updateStateRoot(intent.destChainId, bytes32(uint256(1)));
        vm.startPrank(solver);
        executor.settleIntent(intent, "proof");
        vm.stopPrank();

        assertTrue(executor.settledIntents(_getIntentHash(intent)));
    }

    function test_ChallengeAndSlash() public {
        IIntentSource.Intent memory intent = _createIntent(
            address(sourceAsset),
            100 ether
        );

        vm.startPrank(alice);
        sourceAsset.approve(address(executor), 100 ether);
        executor.lockIntent(intent, _signIntent(intent, alicePrivKey));
        vm.stopPrank();

        executor.updateStateRoot(intent.destChainId, bytes32(uint256(1)));
        vm.prank(solver);
        executor.settleIntent(intent, "bad");

        executor.challengeSettlement(_getIntentHash(intent), "Dispute");
        assertEq(executor.settledIntents(_getIntentHash(intent)), false);
    }

    function test_FinalizeIntent_Native() public {
        IIntentSource.Intent memory intent = _createIntent(address(0), 1 ether);

        vm.deal(alice, 10 ether);
        vm.startPrank(alice);
        executor.lockIntent{value: 1 ether}(
            intent,
            _signIntent(intent, alicePrivKey)
        );
        vm.stopPrank();

        executor.updateStateRoot(intent.destChainId, bytes32(uint256(1)));
        vm.prank(solver);
        executor.settleIntent(intent, "good");

        vm.warp(block.timestamp + 25 hours);
        executor.finalizeIntent(intent);

        assertEq(address(solver).balance >= 0.99 ether, true);
    }

    function _createIntent(
        address asset,
        uint256 amount
    ) internal view returns (IIntentSource.Intent memory) {
        return
            IIntentSource.Intent({
                user: alice,
                sourceAsset: asset,
                amount: amount,
                destChainId: 1337,
                destRecipient: address(0x999),
                destAsset: address(destAsset),
                minDestAmount: (amount * 95) / 100,
                nonce: executor.nonces(alice),
                deadline: block.timestamp + 1 hours,
                extraData: ""
            });
    }

    function _getIntentHash(
        IIntentSource.Intent memory intent
    ) internal view returns (bytes32) {
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
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    executor.DOMAIN_SEPARATOR(),
                    structHash
                )
            );
    }

    function _signIntent(
        IIntentSource.Intent memory intent,
        uint256 privKey
    ) internal view returns (bytes memory) {
        bytes32 hash = _getIntentHash(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        return abi.encodePacked(r, s, v);
    }
}
