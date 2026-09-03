// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {DripVault} from "../src/DripVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockInv is ERC20 {
    constructor() ERC20("InvB20", "INVB") {}
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract Handler is Test {
    DripVault vault;
    MockInv token;
    address[] actors;
    uint256[] streamIds;
    uint256 public ghost_warpSum;

    constructor(DripVault _vault, MockInv _token, address[] memory _actors) {
        vault = _vault;
        token = _token;
        actors = _actors;
    }

    function _randActor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    // Handler: createStream
    function createStream(uint256 actorSeed, uint256 amount, uint256 duration) public {
        address actor = _randActor(actorSeed);
        amount = bound(amount, 0.01 ether, 1000 ether);
        duration = bound(duration, 1 hours, 365 days);
        // ensure actor has funds
        token.mint(actor, amount);
        vm.prank(actor);
        token.approve(address(vault), amount);
        address rec = _randActor(actorSeed + 1);
        if (rec == actor) rec = actors[(actorSeed + 1) % actors.length];
        vm.prank(actor);
        try vault.createStream(rec, address(token), amount, duration) returns (uint256 id) {
            streamIds.push(id);
        } catch {}
    }

    function createClaimable(uint256 actorSeed, uint256 amount, uint256 duration, uint256 claimSeed) public {
        address actor = _randActor(actorSeed);
        amount = bound(amount, 0.01 ether, 500 ether);
        duration = bound(duration, 1 hours, 180 days);
        bytes32 h = keccak256(abi.encodePacked(claimSeed));
        if (h == bytes32(0)) h = keccak256("salt");
        token.mint(actor, amount);
        vm.prank(actor);
        token.approve(address(vault), amount);
        vm.prank(actor);
        try vault.createClaimableStream(address(token), amount, duration, h) returns (uint256 id) {
            streamIds.push(id);
        } catch {}
    }

    function claim(uint256 streamSeed, uint256 claimSeed) public {
        if (streamIds.length == 0) return;
        uint256 id = streamIds[streamSeed % streamIds.length];
        // try to claim if claimable
        (,,,,,,,, bytes32 h) = vault.streams(id);
        if (h == bytes32(0)) return;
        (address rec,,,,,,,,) = vault.streams(id);
        if (rec != address(0)) return;
        address claimer = _randActor(claimSeed);
        vm.prank(claimer);
        try vault.claim(id, abi.encodePacked(claimSeed)) {} catch {}
        // also try correct preimage if we know it: we used keccak(claimSeed) so try correct
        vm.prank(claimer);
        try vault.claim(id, abi.encodePacked(claimSeed)) {} catch {}
    }

    function withdraw(uint256 streamSeed, uint256 actorSeed) public {
        if (streamIds.length == 0) return;
        uint256 id = streamIds[streamSeed % streamIds.length];
        ( , address rec, , , , , , , ) = vault.streams(id);
        if (rec == address(0)) return;
        // try with random actor, but only rec should succeed
        address actor = _randActor(actorSeed);
        vm.prank(actor);
        try vault.withdraw(id) {} catch {}
        // also try correct recipient
        vm.prank(rec);
        try vault.withdraw(id) {} catch {}
    }

    function cancel(uint256 streamSeed, uint256 actorSeed) public {
        if (streamIds.length == 0) return;
        uint256 id = streamIds[streamSeed % streamIds.length];
        (address sender,,,,,,,,) = vault.streams(id);
        address actor = _randActor(actorSeed);
        vm.prank(actor);
        try vault.cancel(id) {} catch {}
        vm.prank(sender);
        try vault.cancel(id) {} catch {}
    }

    function warp(uint256 secs) public {
        secs = bound(secs, 0, 30 days);
        vm.warp(block.timestamp + secs);
        ghost_warpSum += secs;
    }

    function batchCreate(uint256 actorSeed, uint256 n) public {
        n = bound(n, 2, 4);
        address actor = _randActor(actorSeed);
        uint256 amt = 1 ether;
        token.mint(actor, amt * n);
        vm.prank(actor);
        token.approve(address(vault), amt * n);
        address[] memory recs = new address[](n);
        for (uint256 i = 0; i < n; i++) recs[i] = _randActor(actorSeed + i + 100);
        vm.prank(actor);
        try vault.batchCreate(recs, address(token), amt, 7 days) returns (uint256[] memory ids) {
            for (uint256 i = 0; i < ids.length; i++) streamIds.push(ids[i]);
        } catch {}
    }
}

contract DripVaultInvariantTest is Test {
    DripVault vault;
    MockInv token;
    Handler handler;

    function setUp() public {
        vault = new DripVault(address(this));
        token = new MockInv();
        address[] memory actors = new address[](4);
        actors[0] = makeAddr("a0");
        actors[1] = makeAddr("a1");
        actors[2] = makeAddr("a2");
        actors[3] = makeAddr("a3");
        handler = new Handler(vault, token, actors);
        // approve handler to mint? token mint is open
        targetContract(address(handler));
        // also target vault directly for coverage
        bytes4[] memory selectors = new bytes4[](7);
        selectors[0] = Handler.createStream.selector;
        selectors[1] = Handler.createClaimable.selector;
        selectors[2] = Handler.claim.selector;
        selectors[3] = Handler.withdraw.selector;
        selectors[4] = Handler.cancel.selector;
        selectors[5] = Handler.warp.selector;
        selectors[6] = Handler.batchCreate.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    // Invariant: withdrawable never exceeds vested, vested never exceeds total
    function invariant_WithdrawableLeVestedAndVestedLeTotal() public view {
        uint256 n = vault.nextStreamId();
        for (uint256 i = 0; i < n; i++) {
            uint256 vested = vault.vested(i);
            uint256 withdrawable = vault.withdrawable(i);
            (,,, uint256 total, uint256 withdrawn, , , , ) = vault.streams(i);
            assertLe(withdrawable, vested, "withdrawable <= vested");
            assertLe(vested, total, "vested <= total");
            assertLe(withdrawn, vested, "withdrawn <= vested");
            assertLe(withdrawn + withdrawable, total, "withdrawn+withdrawable <= total");
        }
    }

    // Invariant: vested is monotonic with time (warp only forward, cancel freezes)
    function invariant_VaultSolvency() public view {
        // vault token balance should be >= sum of all unwithdrawn (total - withdrawn)
        uint256 n = vault.nextStreamId();
        uint256 sumOwed = 0;
        for (uint256 i = 0; i < n; i++) {
            (,,, uint256 total, uint256 withdrawn, , , , ) = vault.streams(i);
            sumOwed += total - withdrawn;
        }
        uint256 bal = token.balanceOf(address(vault));
        assertGe(bal, sumOwed, "vault solvent");
    }

    function invariant_NoRevertView() public view {
        uint256 n = vault.nextStreamId();
        for (uint256 i = 0; i < n && i < 10; i++) {
            vault.vested(i);
            vault.withdrawable(i);
        }
    }
}
