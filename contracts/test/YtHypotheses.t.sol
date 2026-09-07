// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {DripVault} from "../src/DripVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Fee-on-transfer mock
contract FeeToken is ERC20 {
    uint256 public feeBps = 1000; // 10%
    constructor() ERC20("FeeToken","FEE") {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
    function setFee(uint256 bps) external { feeBps = bps; }
    function _update(address from, address to, uint256 value) internal override {
        uint256 fee = from != address(0) && to != address(0) ? (value * feeBps)/10000 : 0;
        if (fee > 0) super._update(from, address(0xdead), fee); // burn fee, simulate not received by recipient
        super._update(from, to, value - fee);
    }
}

// Malicious reentrant token
contract MaliciousToken is ERC20 {
    address public vault;
    bool public attacking;
    uint256 public targetStreamId;
    bytes public attackPreimage;
    constructor() ERC20("Mal","MAL") {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
    function setVault(address v) external { vault = v; }
    function setAttack(uint256 tid, bytes calldata pre) external { targetStreamId = tid; attackPreimage = pre; attacking = true; }
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (attacking && from != address(0) && to == vault) {
            // try to reenter claim during transferFrom
            // this is called in _createStream's safeTransferFrom
            attacking = false;
            // attempt to claim an existing claimable stream during creation
            // if vault has nonReentrant guard, createStream reentrancy should revert, but claim has no guard
            (bool success, ) = vault.call(abi.encodeWithSignature("claim(uint256,bytes)", targetStreamId, attackPreimage));
            // we don't revert; just log
            emit ReenterAttempt(success);
        }
    }
    event ReenterAttempt(bool success);
}

contract NoReturnToken {
    mapping(address=>uint256) public balanceOf;
    mapping(address=>mapping(address=>uint256)) public allowance;
    function mint(address to, uint256 amt) external { balanceOf[to]+=amt; }
    function approve(address spender, uint256 amt) external returns (bool) { allowance[msg.sender][spender]=amt; return true; }
    function transfer(address to, uint256 amt) external returns (bool) { require(balanceOf[msg.sender]>=amt); balanceOf[msg.sender]-=amt; balanceOf[to]+=amt; return true; }
    function transferFrom(address from, address to, uint256 amt) external returns (bool) { require(allowance[from][msg.sender]>=amt); require(balanceOf[from]>=amt); allowance[from][msg.sender]-=amt; balanceOf[from]-=amt; balanceOf[to]+=amt; return true; }
}

contract MissingReturnToken {
    mapping(address=>uint256) public balanceOf;
    mapping(address=>mapping(address=>uint256)) public allowance;
    function mint(address to, uint256 amt) external { balanceOf[to]+=amt; }
    // note: no return value, should be handled by SafeERC20's "missing return" tolerance
    function approve(address spender, uint256 amt) external { allowance[msg.sender][spender]=amt; }
    function transfer(address to, uint256 amt) external { require(balanceOf[msg.sender]>=amt); balanceOf[msg.sender]-=amt; balanceOf[to]+=amt; }
    function transferFrom(address from, address to, uint256 amt) external { require(allowance[from][msg.sender]>=amt); require(balanceOf[from]>=amt); allowance[from][msg.sender]-=amt; balanceOf[from]-=amt; balanceOf[to]+=amt; }
}

contract AttackerContract {
    DripVault vault;
    address token;
    constructor(DripVault v, address t) { vault=v; token=t; }
    // fallback for receiving tokens and reentering
    function attackWithdraw(uint256 id) external { vault.withdraw(id); }
    fallback() external payable {}
    receive() external payable {}
}

contract YtHypothesesTest is Test {
    DripVault vault;
    FeeToken feeToken;
    MaliciousToken malToken;
    ERC20 mock;
    address sender = makeAddr("sender");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address owner = makeAddr("owner");

    function setUp() public {
        vm.prank(owner);
        vault = new DripVault(owner);
        feeToken = new FeeToken();
        malToken = new MaliciousToken();
        mock = new ERC20Mock();
    }

    // H1: fee-on-transfer (fixed: stores received, withdraw succeeds)
    function test_H1_FeeOnTransferInsolvent() public {
        feeToken.mint(sender, 100 ether);
        vm.prank(sender);
        feeToken.approve(address(vault), 100 ether);
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(feeToken), 100 ether, 100);
        // vault received only 90 due to 10% fee
        assertEq(feeToken.balanceOf(address(vault)), 90 ether, "vault underfunded");
        // FIXED: totalAmount stores actual received (90), not requested (100)
        (,,, uint256 total,,,,,) = vault.streams(id);
        assertEq(total, 90 ether, "stores received");
        vm.warp(block.timestamp + 100);
        assertEq(vault.vested(id), 90 ether);
        assertEq(vault.withdrawable(id), 90 ether);
        // FIXED: withdraw succeeds for received amount
        // Note: FeeToken also taxes the withdraw leg (90 -> 81 net to alice, 9 burned).
        // The fix guarantees solvency (no revert); exit-fee slippage is inherent to FoT tokens.
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(feeToken.balanceOf(address(vault)), 0, "vault emptied");
        assertEq(feeToken.balanceOf(alice), 81 ether, "recipient got 90 minus 10% exit fee");
        console2.log("H1 fee-on-transfer fixed: stores received, withdraw succeeds");
    }

    // H2: batchCreate zero recipient (fixed: reverts ZeroAddress, atomic)
    function test_H2_BatchZeroRecipientLocked() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 20 ether);
        vm.prank(sender);
        m.approve(address(vault), 20 ether);
        address[] memory recs = new address[](2);
        recs[0] = address(0); // zero
        recs[1] = alice;
        // FIXED: batchCreate validates recipients and reverts atomically
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroAddress.selector);
        vault.batchCreate(recs, address(m), 10 ether, 100);
        // atomic: no streams created, no funds moved
        assertEq(vault.nextStreamId(), 0, "atomic revert");
        assertEq(m.balanceOf(address(vault)), 0, "no funds moved");
        console2.log("H2 batch zero recipient fixed: reverts ZeroAddress");
    }

    // H2 duplicate: batchCreate validation (fixed: reverts on zero amount/duration/token/recipient)
    function test_H2_BatchNoValidation() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 100 ether);
        vm.prank(sender);
        m.approve(address(vault), 100 ether);
        address[] memory recs = new address[](1);
        recs[0] = alice;
        // FIXED: zero amount reverts
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroAmount.selector);
        vault.batchCreate(recs, address(m), 0, 100);
        // FIXED: zero duration reverts
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroDuration.selector);
        vault.batchCreate(recs, address(m), 1 ether, 0);
        // FIXED: zero token reverts
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroAddress.selector);
        vault.batchCreate(recs, address(0), 1 ether, 100);
        // FIXED: zero recipient reverts
        recs[0] = address(0);
        vm.prank(sender);
        vm.expectRevert(DripVault.ZeroAddress.selector);
        vault.batchCreate(recs, address(m), 1 ether, 100);
        console2.log("H2 zero amount/duration/token/recipient now validated");
    }

    // Revealed secrets must never be recycled, including canceled streams.
    function test_H3_ClaimHashPermanentlyReserved() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 10 ether);
        vm.prank(sender);
        m.approve(address(vault), 10 ether);
        bytes32 hash = keccak256("single-use-secret");
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(m), 1 ether, 100, hash);
        _commit(id, alice, "single-use-secret");
        vm.prank(alice);
        vault.claim(id, "single-use-secret");
        assertEq(vault.claimHashToStreamId(hash), id + 1);
        vm.prank(sender);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(m), 1 ether, 100, hash);
        vm.prank(sender);
        vault.cancel(id);
        assertEq(vault.claimHashToStreamId(hash), id + 1);
        vm.prank(sender);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(m), 1 ether, 100, hash);
    }

    function _commit(uint256 id, address claimer, bytes memory secret) internal {
        bytes32 commitment = vault.claimCommitmentHash(id, claimer, secret);
        vm.prank(claimer);
        vault.commitClaim(id, commitment);
        vm.roll(block.number + 1);
    }

    // H4b: claim now has nonReentrant - reentrant claim during creation is blocked
    function test_H4_ClaimWithoutGuardReenter() public {
        // Setup: create a claimable stream first
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 10 ether);
        vm.prank(sender);
        m.approve(address(vault), 10 ether);
        bytes32 h = keccak256("secret");
        vm.prank(sender);
        uint256 claimId = vault.createClaimableStream(address(m), 5 ether, 100, h);
        // now use malicious token for another stream that will attempt to claim during transfer
        malToken.mint(sender, 10 ether);
        malToken.setVault(address(vault));
        malToken.setAttack(claimId, "secret");
        _commit(claimId, address(malToken), "secret");
        vm.prank(sender);
        malToken.approve(address(vault), 10 ether);
        // creating stream with malicious token triggers reenter to claim,
        // but claim is now nonReentrant so the inner call reverts (swallowed as success=false)
        vm.prank(sender);
        uint256 id2 = vault.createStream(alice, address(malToken), 1 ether, 100);
        // FIXED: claim stayed unclaimed (recipient still 0), outer creation succeeded
        (, address recAfter,,,,,,,) = vault.streams(claimId);
        assertEq(recAfter, address(0), "reentrant claim blocked, still unclaimed");
        // legitimate claim still works afterwards
        _commit(claimId, alice, "secret");
        vm.prank(alice);
        vault.claim(claimId, "secret");
        (, address recFinal,,,,,,,) = vault.streams(claimId);
        assertEq(recFinal, alice, "legit claim works, no deadlock");
        console2.log("H4b reentrant claim blocked, legit claim works", recFinal);
    }

    function test_H4_GuessableSecretStillUnsafe() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 10 ether);
        vm.prank(sender);
        m.approve(address(vault), 10 ether);
        bytes32 h = keccak256("alice@example.com"); // low entropy email
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(m), 10 ether, 1000, h);
        // Low entropy secrets remain unsafe: an attacker can guess and commit in advance.
        _commit(id, bob, "alice@example.com");
        vm.prank(bob);
        vault.claim(id, "alice@example.com");
        (, address rec,,,,,,,) = vault.streams(id);
        assertEq(rec, bob);
        // alice now cannot claim
        vm.prank(alice);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.claim(id, "alice@example.com");
        // bob can withdraw
        vm.warp(block.timestamp + 1000);
        vm.prank(bob);
        vault.withdraw(id);
        assertEq(m.balanceOf(bob), 10 ether);
        console2.log("H4 front-run claim steal reproducibly");
    }

    // H5 overflow (fixed: Math.mulDiv avoids overflow, no DOS)
    function test_H5_VestedOverflowDOS() public {
        // Use malicious token that allows huge amount without balance
        // Instead use mock that we mint huge amount
        ERC20Mock m = ERC20Mock(address(mock));
        // mint maxish
        uint256 huge = type(uint256).max / 2;
        // need to mint to sender: may overflow ERC20 totalSupply? Let's use smaller huge that still overflows multiplication
        // totalAmount * elapsed overflow when totalAmount > 2^256 / duration
        // pick totalAmount = 2^200, duration=1e6, elapsed=1e6 => product 2^200 *1e6 ~2^219 still overflow? Actually 2^200*1e6 <2^256? 2^200*2^20=2^220 <2^256, not overflow. Need bigger.
        // Use totalAmount = 2^240, duration=31536000 (~2^25), product =2^265 >2^256 overflow
        uint256 bigAmt = uint256(1) << 240; // 2^240
        m.mint(sender, bigAmt);
        vm.prank(sender);
        m.approve(address(vault), bigAmt);
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(m), bigAmt, 31536000);
        vm.warp(block.timestamp + 15768000); // half
        // FIXED: Math.mulDiv computes without overflow — vested is bigAmt/2
        assertEq(vault.vested(id), bigAmt / 2, "mulDiv half vested");
        assertEq(vault.withdrawable(id), bigAmt / 2, "withdrawable half");
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(m.balanceOf(alice), bigAmt / 2, "withdraw half succeeds");
        // cancel after partial withdraw also succeeds (no overflow)
        vm.prank(sender);
        vault.cancel(id);
        // refund + withdrawn accounting: refund is remaining unvested half
        assertEq(m.balanceOf(sender), bigAmt / 2, "refund remaining half");
        assertEq(vault.vested(id), bigAmt / 2, "frozen vested");
        assertEq(vault.withdrawable(id), 0, "nothing left after withdraw+freeze");
        console2.log("H5 overflow fixed: mulDiv succeeds");
    }

    // H6 cancel unclaimed claimable locks vested
    function test_H6_CancelUnclaimedLocksVested() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 10 ether);
        vm.prank(sender);
        m.approve(address(vault), 10 ether);
        bytes32 h = keccak256("ghost");
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(m), 10 ether, 100, h);
        vm.warp(block.timestamp + 50);
        // sender cancels before claim: vested 5, refund 5
        vm.prank(sender);
        vault.cancel(id);
        assertEq(m.balanceOf(sender), 5 ether); // refund
        assertEq(vault.vested(id), 5 ether);
        // vested 5 remains but recipient is 0, cannot withdraw, stuck
        assertEq(m.balanceOf(address(vault)), 5 ether);
        vm.prank(alice);
        vm.expectRevert(DripVault.NotRecipient.selector);
        vault.withdraw(id);
        // even if someone claims now, they can get vested? Let's see
        _commit(id, alice, "ghost");
        vm.prank(alice);
        vault.claim(id, "ghost");
        vm.prank(alice);
        vault.withdraw(id);
        assertEq(m.balanceOf(alice), 5 ether); // after claim, can withdraw
        // So not fully locked if claim allowed after cancel, but before claim it's locked; and if cancel disallowed claim? Currently allowed, but spec ambiguous
        // If claim after cancel is considered unintended, then funds locked; if intended, then okay but mapping still squatted
        console2.log("H6 unclaimed cancel partial lock, but claim after cancel works");
    }

    // Ownable no privileged ops
    function test_OwnableNoVaultOps() public {
        assertEq(vault.owner(), owner);
        vm.prank(owner);
        vault.transferOwnership(alice);
        assertEq(vault.owner(), alice);
        vm.prank(alice);
        vault.renounceOwnership();
        assertEq(vault.owner(), address(0));
        // no vault functions are onlyOwner, so ownership is dead weight
        console2.log("Ownable has no vault ops, dead ownership");
    }
}

contract ERC20Mock is ERC20 {
    constructor() ERC20("Mock","MCK") {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}
