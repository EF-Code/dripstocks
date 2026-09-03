// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DripVault} from "../src/DripVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockB20 is ERC20 {
    constructor() ERC20("AAPLc", "AAPLc") {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract DripVaultTest is Test {
    DripVault vault;
    MockB20 token;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address sender = makeAddr("sender");

    function setUp() public {
        vault = new DripVault(address(this));
        token = new MockB20();
        token.mint(sender, 1000 ether);
        vm.prank(sender);
        token.approve(address(vault), type(uint256).max);
    }

    function test_createAndVest() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 100 ether, 100);
        assertEq(vault.vested(id), 0);
        vm.warp(block.timestamp + 50);
        assertEq(vault.vested(id), 50 ether);
        assertEq(vault.withdrawable(id), 50 ether);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 50 ether);
        vm.warp(block.timestamp + 50);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 100 ether);
    }

    function test_claimable() public {
        bytes32 hash = keccak256("alice@example.com");
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(token), 100 ether, 100, hash);
        vm.warp(block.timestamp + 10);
        // bob claims with preimage
        vm.prank(bob);
        vault.claim(id, "alice@example.com");
        vm.warp(block.timestamp + 40);
        vm.prank(bob);
        vault.withdraw(id);
        assertEq(token.balanceOf(bob), 50 ether);
    }

    function test_cancel() public {
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(token), 100 ether, 100);
        vm.warp(block.timestamp + 40);
        vm.prank(sender);
        vault.cancel(id);
        // 40 vested, 60 refunded
        assertEq(token.balanceOf(sender), 900 ether + 60 ether);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 40 ether);
    }
}
