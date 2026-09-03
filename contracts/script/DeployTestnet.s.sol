// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {DripVault} from "../src/DripVault.sol";
import {MockB20} from "../src/mocks/MockB20.sol";

/// @notice Deploys 6 MockB20 tokens + DripVault for Base Sepolia.
/// @dev Usage:
///      forge script script/DeployTestnet.s.sol --rpc-url $BASE_SEPOLIA_RPC \
///        --private-key $PRIVATE_KEY --broadcast
///      Copy the logged addresses into app/.env.local (see app/.env.example).
contract DeployTestnet is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        MockB20 aapl = new MockB20("Apple Mock Tokenized Stock", "AAPLc");
        MockB20 nvda = new MockB20("Nvidia Mock Tokenized Stock", "NVDAc");
        MockB20 meta = new MockB20("Meta Mock Tokenized Stock", "METAc");
        MockB20 googl = new MockB20("Alphabet Mock Tokenized Stock", "GOOGLc");
        MockB20 msft = new MockB20("Microsoft Mock Tokenized Stock", "MSFTc");
        MockB20 tsla = new MockB20("Tesla Mock Tokenized Stock", "TSLAc");

        // Seed deployer with demo funds (1000 of each mock).
        aapl.mint(deployer, 1000 ether);
        nvda.mint(deployer, 1000 ether);
        meta.mint(deployer, 1000 ether);
        googl.mint(deployer, 1000 ether);
        msft.mint(deployer, 1000 ether);
        tsla.mint(deployer, 1000 ether);

        DripVault vault = new DripVault(deployer);
        vm.stopBroadcast();

        console2.log("=== DripStocks Sepolia deployment ===");
        console2.log("AAPLc mock:", address(aapl));
        console2.log("NVDAc mock:", address(nvda));
        console2.log("METAc mock:", address(meta));
        console2.log("GOOGLc mock:", address(googl));
        console2.log("MSFTc mock:", address(msft));
        console2.log("TSLAc mock:", address(tsla));
        console2.log("DripVault:", address(vault));
        console2.log("owner:", deployer);
    }
}
