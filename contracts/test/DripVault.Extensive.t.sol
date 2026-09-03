// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {DripVault} from "../src/DripVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockB20Ext is ERC20 {
    constructor() ERC20("AAPLc-Mock", "AAPLc") {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
    // B20 helpers to simulate multiplier (not used by vault, but for fork parity)
    uint256 public multiplier = 1e18;
    function setMultiplier(uint256 m) external { multiplier = m; }
    function scaledBalanceOf(address a) external view returns (uint256) { return (balanceOf(a) * multiplier) / 1e18; }
}

contract DripVaultExtensiveTest is Test {
    DripVault vault;
    MockB20Ext token;
    address owner = makeAddr("owner");
    address sender = makeAddr("sender");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    function setUp() public {
        vm.prank(owner);
        vault = new DripVault(owner);
        token = new MockB20Ext();
        token.mint(sender, 1_000_000 ether);
        token.mint(alice, 10 ether);
        vm.prank(sender);
        token.approve(address(vault), type(uint256).max);
        vm.prank(alice);
        token.approve(address(vault), type(uint256).max);
    }

    // ===== Helpers =====
    function _create(address rec, uint256 amt, uint256 dur) internal returns (uint256 id) {
        vm.prank(sender);
        id = vault.createStream(rec, address(token), amt, dur);
    }

    // ===== CREATE edge cases =====
    function testRevert_ZeroRecipient() public {
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroAddress.selector);
        vault.createStream(address(0), address(token), 1 ether, 100);
    }

    function testRevert_ZeroToken() public {
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroAddress.selector);
        vault.createStream(alice, address(0), 1 ether, 100);
    }

    function testRevert_ZeroAmount() public {
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroAmount.selector);
        vault.createStream(alice, address(token), 0, 100);
    }

    function testRevert_ZeroDuration() public {
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroDuration.selector);
        vault.createStream(alice, address(token), 1 ether, 0);
    }

    function testRevert_ClaimHashZero() public {
        vm.prank(sender);
        vm.expectRevert(DripVault.InvalidClaim.selector);
        vault.createClaimableStream(address(token), 1 ether, 100, bytes32(0));
    }

    function testRevert_DuplicateClaimHash() public {
        bytes32 h = keccak256("dup");
        vm.prank(sender);
        vault.createClaimableStream(address(token), 1 ether, 100, h);
        vm.prank(sender);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(token), 1 ether, 100, h);
    }

    function test_CreateTransfersTokens() public {
        uint256 balBefore = token.balanceOf(sender);
        uint256 vaultBefore = token.balanceOf(address(vault));
        vm.prank(sender);
        vault.createStream(alice, address(token), 10 ether, 1000);
        assertEq(token.balanceOf(sender), balBefore - 10 ether);
        assertEq(token.balanceOf(address(vault)), vaultBefore + 10 ether);
    }

    function test_CreateClaimableThenClaim() public {
        bytes32 h = keccak256("alice@example.com");
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(token), 100 ether, 1000, h);
        (, address recBefore,,,,,,,) = vault.streams(id);
        assertEq(recBefore, address(0));
        vm.prank(alice);
        vault.claim(id, "alice@example.com");
        (, address recAfter,,,,,,,) = vault.streams(id);
        assertEq(recAfter, alice);
    }

    function testRevert_ClaimWrongPreimage() public {
        bytes32 h = keccak256("alice@example.com");
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(token), 10 ether, 100, h);
        vm.prank(bob);
        vm.expectRevert(DripVault.InvalidClaim.selector);
        vault.claim(id, "bob@example.com");
    }

    function testRevert_ClaimAlreadyClaimed() public {
        bytes32 h = keccak256("once");
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(token), 10 ether, 100, h);
        vm.prank(alice);
        vault.claim(id, "once");
        vm.prank(bob);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.claim(id, "once");
    }

    function testRevert_ClaimDirectStream() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 10 ether, 100);
        vm.prank(alice);
        vm.expectRevert(DripVault.InvalidClaim.selector);
        vault.claim(id, "anything");
    }

    // ===== VESTING math =====
    function test_VestedAtBoundaries() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 100 ether, 100);
        (,, , uint256 total,, uint256 start, uint256 end,,) = vault.streams(id);
        assertEq(start, block.timestamp);
        assertEq(end, block.timestamp + 100);
        assertEq(total, 100 ether);
        assertEq(vault.vested(id), 0);
        vm.warp(start + 1);
        assertEq(vault.vested(id), 1 ether);
        vm.warp(start + 50);
        assertEq(vault.vested(id), 50 ether);
        vm.warp(end);
        assertEq(vault.vested(id), 100 ether);
        vm.warp(end + 1000);
        assertEq(vault.vested(id), 100 ether);
    }

    function testFuzz_VestedLinear(uint256 amount, uint256 duration, uint256 warpOffset) public {
        amount = bound(amount, 1, 1e24);
        duration = bound(duration, 1, 365 days);
        uint256 start = block.timestamp;
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), amount, duration);
        uint256 end = start + duration;
        warpOffset = bound(warpOffset, 0, duration * 2);
        vm.warp(start + warpOffset);
        uint256 expected;
        if (warpOffset == 0) expected = 0;
        else if (start + warpOffset >= end) expected = amount;
        else expected = (amount * warpOffset) / duration;
        assertEq(vault.vested(id), expected, "linear vest");
        // withdrawable never exceeds vested
        assertLe(vault.withdrawable(id), vault.vested(id));
    }

    function testFuzz_WithdrawableNeverExceedsVested(uint256 amount, uint256 duration) public {
        amount = bound(amount, 1 ether, 1000 ether);
        duration = bound(duration, 10, 10000);
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), amount, duration);
        vm.warp(block.timestamp + duration / 2);
        vm.prank(alice);
        vault.withdraw(id);
        uint256 vested = vault.vested(id);
        uint256 withdrawn = token.balanceOf(alice) - 10 ether; // alice started with 10
        // withdrawn == vested at that point
        assertEq(withdrawn, vested);
        assertEq(vault.withdrawable(id), 0);
    }

    // ===== WITHDRAW =====
    function testRevert_WithdrawNotRecipient() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 10 ether, 100);
        vm.warp(block.timestamp + 50);
        vm.prank(bob);
        vm.expectRevert(DripVault.NotRecipient.selector);
        vault.withdraw(id);
    }

    function testRevert_WithdrawClaimableNotClaimed() public {
        bytes32 h = keccak256("ghost");
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(token), 10 ether, 100, h);
        vm.warp(block.timestamp + 50);
        vm.prank(alice);
        vm.expectRevert(DripVault.NotRecipient.selector);
        vault.withdraw(id);
    }

    function testRevert_WithdrawNothing() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 10 ether, 100);
        vm.prank(alice);
        vm.expectRevert(DripVault.NothingToWithdraw.selector);
        vault.withdraw(id);
    }

    function test_WithdrawPartialThenFull() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 100 ether, 100);
        vm.warp(block.timestamp + 30);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 10 ether + 30 ether);
        vm.warp(block.timestamp + 30);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 10 ether + 60 ether);
        vm.warp(block.timestamp + 40);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 10 ether + 100 ether);
        assertEq(vault.withdrawable(id), 0);
        // further withdraw reverts
        vm.prank(alice);
        vm.expectRevert(DripVault.NothingToWithdraw.selector);
        vault.withdraw(id);
    }

    function test_WithdrawAfterEnd() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 50 ether, 100);
        vm.warp(block.timestamp + 1000);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 10 ether + 50 ether);
    }

    // ===== CANCEL =====
    function test_CancelBeforeStart_NoVested() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 100 ether, 100);
        // cancel immediately at start
        vm.prank(sender);
        vault.cancel(id);
        assertEq(token.balanceOf(sender), 1_000_000 ether - 100 ether + 100 ether); // full refund
        // alice cannot withdraw
        vm.prank(alice);
        vm.expectRevert(DripVault.NothingToWithdraw.selector);
        vault.withdraw(id);
    }

    function test_CancelMidStream() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 100 ether, 100);
        vm.warp(block.timestamp + 40);
        uint256 balSenderBefore = token.balanceOf(sender);
        vm.prank(sender);
        vault.cancel(id);
        // 60 refund, 40 remains vested
        assertEq(token.balanceOf(sender), balSenderBefore + 60 ether);
        // vested frozen at 40
        assertEq(vault.vested(id), 40 ether);
        vm.warp(block.timestamp + 1000);
        assertEq(vault.vested(id), 40 ether, "frozen");
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 10 ether + 40 ether);
    }

    function test_CancelAfterEnd_FullVestedNoRefund() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 20 ether, 50);
        vm.warp(block.timestamp + 100);
        uint256 balBefore = token.balanceOf(sender);
        vm.prank(sender);
        vault.cancel(id);
        assertEq(token.balanceOf(sender), balBefore); // no refund
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 10 ether + 20 ether);
    }

    function testRevert_CancelNotSender() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 10 ether, 100);
        vm.prank(alice);
        vm.expectRevert(DripVault.NotSender.selector);
        vault.cancel(id);
    }

    function testRevert_CancelTwice() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 10 ether, 100);
        vm.prank(sender);
        vault.cancel(id);
        vm.prank(sender);
        vm.expectRevert(DripVault.StreamCanceled.selector);
        vault.cancel(id);
    }

    function test_WithdrawAfterCancel() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 100 ether, 100);
        vm.warp(block.timestamp + 25);
        vm.prank(sender);
        vault.cancel(id);
        // warp far, vested should stay 25
        vm.warp(block.timestamp + 1000);
        assertEq(vault.withdrawable(id), 25 ether);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(vault.withdrawable(id), 0);
    }

    function testFuzz_CancelRefundPlusVestedEqualsTotal(uint256 amount, uint256 duration, uint256 cancelOffset) public {
        amount = bound(amount, 1 ether, 10000 ether);
        duration = bound(duration, 1, 10000);
        cancelOffset = bound(cancelOffset, 0, duration * 2);
        // ensure sender has enough
        token.mint(sender, amount);
        vm.prank(sender);
        token.approve(address(vault), amount);
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), amount, duration);
        uint256 start = block.timestamp;
        vm.warp(start + cancelOffset);
        uint256 vestedBefore = vault.vested(id);
        uint256 balSenderBefore = token.balanceOf(sender);
        vm.prank(sender);
        vault.cancel(id);
        uint256 refund = token.balanceOf(sender) - balSenderBefore;
        uint256 frozenVested = vault.vested(id);
        assertEq(refund + frozenVested, amount, "refund+vested=total");
        assertEq(frozenVested, vestedBefore);
    }

    // ===== BATCH =====
    function test_BatchCreate() public {
        address[] memory recs = new address[](3);
        recs[0] = alice; recs[1] = bob; recs[2] = carol;
        vm.prank(sender);
        uint256[] memory ids = vault.batchCreate(recs, address(token), 10 ether, 100);
        assertEq(ids.length, 3);
        assertEq(ids[0] + 1, ids[1]);
        assertEq(token.balanceOf(address(vault)), 30 ether);
        // each has correct stream
        (address s, address r, address t, uint256 amt,,,,,) = vault.streams(ids[1]);
        assertEq(s, sender);
        assertEq(r, bob);
        assertEq(t, address(token));
        assertEq(amt, 10 ether);
        vm.warp(block.timestamp + 50);
        vm.prank(bob);
        vault.withdraw(ids[1]);
        assertEq(token.balanceOf(bob), 5 ether);
    }

    function test_BatchCreateTransfersCorrectTotal() public {
        address[] memory recs = new address[](2);
        recs[0] = alice; recs[1] = bob;
        uint256 before = token.balanceOf(sender);
        vm.prank(sender);
        vault.batchCreate(recs, address(token), 7 ether, 100);
        assertEq(token.balanceOf(sender), before - 14 ether);
    }

    // ===== OWNABLE =====
    function test_OwnerIsSet() public {
        assertEq(vault.owner(), owner);
    }

    // ===== INVARIANT helpers (used by invariant test) =====
    function invariant_WithdrawableLeVested() public {
        uint256 n = vault.nextStreamId();
        for (uint256 i = 0; i < n && i < 5; i++) {
            assertLe(vault.withdrawable(i), vault.vested(i));
        }
    }
}
