// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {DripVault} from "../src/DripVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        DripVault vault = new DripVault(vm.addr(pk));
        vm.stopBroadcast();
        // forge script will log address; also write to file for frontend
    }
}
