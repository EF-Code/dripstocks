// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockB20 - Sepolia stand-in for a Coinbase B20 tokenized stock
/// @notice Mirrors the B20 interface the vault relies on (18 decimals, multiplier,
///         scaledBalanceOf, WAD_PRECISION). Open mint is intentional testnet faucet
///         behavior. NEVER deploy to mainnet: real B20 tokens are Base precompiles.
contract MockB20 is ERC20 {
    uint256 public multiplier = 1e18;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setMultiplier(uint256 m) external {
        multiplier = m;
    }

    function WAD_PRECISION() external pure returns (uint256) {
        return 1e18;
    }

    function scaledBalanceOf(address account) external view returns (uint256) {
        return (balanceOf(account) * multiplier) / 1e18;
    }
}
