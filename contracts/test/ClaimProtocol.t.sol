// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {DripVaultTest} from "./DripVault.t.sol";
import {DripVault} from "../src/DripVault.sol";
import {DeployTestnet} from "../script/DeployTestnet.s.sol";

contract ClaimProtocolTest is DripVaultTest {
    function _create(bytes memory secret) internal returns (uint256 id) {
        vm.prank(sender);
        return vault.createClaimableStream(address(token), 100 ether, 100, keccak256(secret));
    }
    function testFuzz_CopiedRevealAndCommitmentCannotSteal(bytes32 randomSecret) public {
        bytes memory secret = abi.encode(randomSecret);
        uint256 id = _create(secret);
        bytes32 commitment = vault.claimCommitmentHash(id, alice, secret);
        assertEq(commitment, keccak256(abi.encode(address(vault), block.chainid, id, alice, secret)));
        assertEq(vault.claimProtocolVersion(), 2);
        vm.prank(alice);
        vault.commitClaim(id, commitment);
        vm.prank(bob);
        vault.commitClaim(id, commitment);
        vm.roll(block.number + 1);
        vm.prank(bob);
        vm.expectRevert(DripVault.InvalidCommitment.selector);
        vault.claim(id, secret);
        // An attacker learning the reveal can only commit in the current block.
        bytes32 attack = vault.claimCommitmentHash(id, bob, secret);
        vm.prank(bob);
        vault.commitClaim(id, attack);
        vm.prank(bob);
        vm.expectRevert(DripVault.CommitmentNotMature.selector);
        vault.claim(id, secret);
        vm.prank(alice);
        vault.claim(id, secret);
        (, address recipient,,,,,,,) = vault.streams(id);
        assertEq(recipient, alice);
        (bytes32 cleared, uint256 height) = vault.claimCommitments(id, alice);
        assertEq(cleared, bytes32(0));
        assertEq(height, 0);
        assertEq(vault.claimHashToStreamId(keccak256(secret)), id + 1);
    }
    function test_MissingWrongAndSameBlockCommitment() public {
        bytes memory secret = abi.encode(bytes32(uint256(987)));
        uint256 id = _create(secret);
        vm.startPrank(alice);
        vm.expectRevert(DripVault.InvalidCommitment.selector);
        vault.claim(id, secret);
        vault.commitClaim(id, bytes32(uint256(1)));
        vm.roll(block.number + 1);
        vm.expectRevert(DripVault.InvalidCommitment.selector);
        vault.claim(id, secret);
        vault.commitClaim(id, vault.claimCommitmentHash(id, alice, secret));
        vm.expectRevert(DripVault.CommitmentNotMature.selector);
        vault.claim(id, secret);
        vm.roll(block.number + 1);
        vault.claim(id, secret);
        vm.stopPrank();
    }
    function test_CancelUnclaimedKeepsReservationAndAllowsVestedClaim() public {
        bytes memory secret = abi.encode(bytes32(uint256(123)));
        uint256 id = _create(secret);
        vm.warp(block.timestamp + 50);
        vm.prank(sender);
        vault.cancel(id);
        assertEq(vault.claimHashToStreamId(keccak256(secret)), id + 1);
        vm.prank(sender);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(token), 1 ether, 100, keccak256(secret));
        bytes32 commitment = vault.claimCommitmentHash(id, alice, secret);
        vm.prank(alice);
        vault.commitClaim(id, commitment);
        vm.roll(block.number + 1);
        vm.prank(alice);
        vault.claim(id, secret);
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(token.balanceOf(alice), 50 ether);
        assertEq(vault.claimHashToStreamId(keccak256(secret)), id + 1);
    }
    function test_TestnetDeploymentRejectsMainnetBeforeReadingKey() public {
        DeployTestnet script = new DeployTestnet();
        vm.chainId(8453);
        vm.expectRevert(abi.encodeWithSelector(DeployTestnet.UnsupportedChain.selector, 8453));
        script.run();
    }
}
