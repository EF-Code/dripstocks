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
        deploy.run();
    }

    function test_RevertsOnSepoliaChainId84532DoesNotRevertUnsupported() public {
        vm.chainId(84532);
        vm.setEnv("PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7b4b3ff80");
        deploy.run();
    }
}
