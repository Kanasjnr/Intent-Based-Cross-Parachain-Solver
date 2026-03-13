// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/IntentSourceVault.sol";
import "../src/IXcm.sol";
import "./MockERC20.sol";

contract MockXcm is IXcm {
    function execute(bytes calldata, Weight calldata) external {}
    function send(bytes calldata, bytes calldata) external {}
    function weighMessage(
        bytes calldata
    ) external view returns (Weight memory) {
        return Weight(0, 0);
    }
}

contract IntentSourceVaultTest is Test {
    IntentSourceVault public vault;
    MockERC20 public token;

    address public user = address(0x1);
    uint256 public userPrivateKey = 0x123;
    address public solver = address(0x2);
    address public treasury = address(0x99);

    function setUp() public {
        // Deploy MockXcm at precompile address
        MockXcm mockXcm = new MockXcm();
        vm.etch(XCM_PRECOMPILE_ADDRESS, address(mockXcm).code);

        token = new MockERC20("Test Token", "TEST");
        vault = new IntentSourceVault(treasury, address(token));

        // Whitelist this contract/address as a solver for testing
        vault.setSolverWhitelist(address(this), true);
        vault.setSolverWhitelist(solver, true);

        user = vm.addr(userPrivateKey);
        token.mint(user, 1000 ether);

        vm.prank(user);
        token.approve(address(vault), type(uint256).max);
    }

    function _signIntent(
        IIntentSource.Intent memory intent
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                vault.INTENT_TYPEHASH(),
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

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", vault.domainSeparator(), structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _getIntentHash(
        IIntentSource.Intent memory intent
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    vault.domainSeparator(),
                    keccak256(
                        abi.encode(
                            vault.INTENT_TYPEHASH(),
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
                )
            );
    }

    function test_LockIntent_Success() public {
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);

        vm.prank(user);
        vault.lockIntent(intent, signature);

        assertEq(token.balanceOf(address(vault)), 100 ether);
        assertEq(vault.nonces(user), 1);
    }

    function test_LockIntent_RevertIf_Expired() public {
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp - 1,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);

        vm.expectRevert("Vault: intent expired");
        vm.prank(user);
        vault.lockIntent(intent, signature);
    }

    function test_SettleIntent_Success() public {
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);

        vm.prank(user);
        vault.lockIntent(intent, signature);

        bytes32 intentHash = _getIntentHash(intent);

        // Solver must have a bond to settle
        token.mint(solver, 100 ether);
        vm.startPrank(solver);
        token.approve(address(vault), 100 ether);
        vault.depositBond(10 ether);

        vault.settleIntent(intent, "mock_proof");
        vm.stopPrank();

        uint256 expectedFee = (100 ether * vault.feeBps()) / 10000;
        uint256 expectedSolverAmount = 100 ether - expectedFee;

        // Funds should NOT be released yet
        // 100 ether minted - 10 ether bond = 90 ether
        assertEq(token.balanceOf(solver), 90 ether);
        assertTrue(vault.settledIntents(intentHash));

        // Attempt early finalization (should revert)
        vm.prank(solver);
        vm.expectRevert("Vault: challenge active");
        vault.finalizeIntent(intent);

        // Warp past challenge period
        vm.warp(block.timestamp + 25 hours);

        vm.prank(solver);
        vault.finalizeIntent(intent);

        // Final balance: 100 initial - 10 bond + 99.5 reward = 189.5 ether
        assertEq(token.balanceOf(solver), 189.5 ether);
        assertEq(token.balanceOf(treasury), expectedFee);
        assertEq(vault.solverReputation(solver), 1);
    }

    function test_SettleIntent_RevertIf_NotWhitelisted() public {
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);

        vm.prank(user);
        vault.lockIntent(intent, signature);

        // Provide bond so we can reach the whitelist check
        address rogueSolver = address(0xbad);
        token.mint(rogueSolver, 100 ether);
        vm.startPrank(rogueSolver);
        token.approve(address(vault), 100 ether);
        vault.depositBond(10 ether);

        vm.expectRevert("Vault: unauthorized solver");
        vault.settleIntent(intent, "mock_proof");
        vm.stopPrank();
    }

    function test_Pause_RevertIf_Locked() public {
        vault.pause();

        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);

        vm.prank(user);
        vm.expectRevert("Pausable: paused");
        vault.lockIntent(intent, signature);
    }

    function test_SettleIntent_RevertIf_NotRegistered() public {
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        // Provide bond first
        token.mint(solver, 100 ether);
        vm.startPrank(solver);
        token.approve(address(vault), 100 ether);
        vault.depositBond(10 ether);

        vm.expectRevert("Vault: intent not found");
        vault.settleIntent(intent, "mock_proof");
        vm.stopPrank();
    }

    function test_RefundIntent_Success() public {
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);

        vm.prank(user);
        vault.lockIntent(intent, signature);

        vm.warp(block.timestamp + 2 hours);

        vault.refundIntent(intent);

        assertEq(token.balanceOf(user), 1000 ether);
    }

    function test_Bonding_Success() public {
        token.mint(solver, 100 ether);
        vm.startPrank(solver);
        token.approve(address(vault), 100 ether);

        vault.depositBond(10 ether);
        assertEq(vault.solverBonds(solver), 10 ether);
        assertEq(token.balanceOf(address(vault)), 10 ether);

        vault.withdrawBond(5 ether);
        assertEq(vault.solverBonds(solver), 5 ether);
        vm.stopPrank();
    }

    function test_Bonding_RevertIf_BelowMinimum() public {
        token.mint(solver, 5 ether);
        vm.startPrank(solver);
        token.approve(address(vault), 5 ether);

        vm.expectRevert("Vault: insufficient bond amount");
        vault.depositBond(5 ether);
        vm.stopPrank();
    }

    function test_SettleIntent_RevertIf_InsufficientBond() public {
        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);
        vm.prank(user);
        vault.lockIntent(intent, signature);

        // Whitelisted but NO bond
        vm.prank(solver);
        vm.expectRevert("Vault: solver bond required");
        vault.settleIntent(intent, "mock_proof");
    }

    function test_WithdrawBond_RevertIf_ActiveChallenge() public {
        token.mint(solver, 100 ether);
        vm.startPrank(solver);
        token.approve(address(vault), 100 ether);
        vault.depositBond(20 ether);

        IIntentSource.Intent memory intent = IIntentSource.Intent({
            user: user,
            sourceAsset: address(token),
            amount: 100 ether,
            destChainId: 2000,
            destRecipient: solver,
            destAsset: address(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            extraData: ""
        });

        bytes memory signature = _signIntent(intent);
        vm.stopPrank();
        vm.prank(user);
        vault.lockIntent(intent, signature);

        vm.prank(solver);
        vault.settleIntent(intent, "mock_proof");

        vm.prank(solver);
        vm.expectRevert("Vault: bond locked for challenge");
        vault.withdrawBond(10 ether);

        // Warp past challenge period
        vm.warp(block.timestamp + 25 hours);
        vm.prank(solver);
        vault.withdrawBond(10 ether);
        assertEq(vault.solverBonds(solver), 10 ether);
    }
}
