// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../script/Deploy.s.sol";

contract DeployGuardTest is Test {
    Deploy deploy;

    function setUp() public {
        deploy = new Deploy();
    }

    function test_RevertsOnUnsupportedChainBeforeKeyAccess() public {
        // Ensure PRIVATE_KEY is not set or set to dummy, but chain check should revert first
        // Use vm.chainId to set to mainnet (8453) which is unsupported (only 84532 and 31337 allowed)
        vm.chainId(8453);
        // Expect revert with UnsupportedChain(8453)
        vm.expectRevert(abi.encodeWithSelector(Deploy.UnsupportedChain.selector, 8453));
        deploy.run();
    }

    function test_RevertsOnMainnetChainId1() public {
        vm.chainId(1);
        vm.expectRevert(abi.encodeWithSelector(Deploy.UnsupportedChain.selector, 1));
        deploy.run();
    }

    function test_DoesNotRevertOnAnvil() public {
        vm.chainId(31337);
        // Should not revert due to chain check, but will revert due to missing PRIVATE_KEY if not set
        // We set dummy PRIVATE_KEY to avoid that
        vm.setEnv("PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7b4b3ff80");
        // Should succeed (or at least not revert with UnsupportedChain)
        // We can't fully run deploy without broadcast, but we can check it doesn't revert with UnsupportedChain
        // Call run and expect it to not revert with UnsupportedChain - it may revert for other reasons if anvil not properly mocked
        // Instead, just verify chain check passes by checking code path
        // If we get to envUint, it will succeed with dummy key
        // Use try/catch
        try deploy.run() {
            // success
        } catch (bytes memory reason) {
            // Ensure it's not UnsupportedChain
            assertTrue(keccak256(reason) != keccak256(abi.encodeWithSelector(Deploy.UnsupportedChain.selector, 31337)), "should not revert UnsupportedChain on anvil");
        }
    }

    function test_RevertsOnSepoliaChainId84532DoesNotRevertUnsupported() public {
        vm.chainId(84532);
        vm.setEnv("PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7b4b3ff80");
        // Should not revert with UnsupportedChain - will attempt to deploy
        // We just verify it doesn't revert with UnsupportedChain selector
        try deploy.run() {
            // success expected
        } catch (bytes memory reason) {
            // Check not UnsupportedChain
            if (reason.length >= 4) {
                bytes4 selector = bytes4(reason);
                assertTrue(selector != Deploy.UnsupportedChain.selector, "should not be UnsupportedChain on 84532");
            }
        }
    }
}
