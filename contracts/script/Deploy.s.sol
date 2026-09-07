// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {DripVault} from "../src/DripVault.sol";

contract Deploy is Script {
    error UnsupportedChain(uint256 chainId);

    function run() external {
        if (block.chainid != 84532 && block.chainid != 31337) revert UnsupportedChain(block.chainid);
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        DripVault vault = new DripVault(vm.addr(pk));
        vm.stopBroadcast();
        console2.log("chainId:", block.chainid);
        console2.log("DripVault:", address(vault));
        console2.log("owner:", vm.addr(pk));
    }
}
