// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockLPToken
 * @dev A simple mock LP token for Uniswap simulations in tests
 */
contract MockLPToken is ERC20, Ownable {
    constructor() ERC20("Mock LP Token", "MLPT") {
        // No initial supply
    }
    
    /**
     * @dev Mint new LP tokens to an address
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn LP tokens from an address
     * @param from The address that will lose tokens
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
} 