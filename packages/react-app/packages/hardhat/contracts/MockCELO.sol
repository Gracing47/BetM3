// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockCELO
 * @dev A mock implementation of the CELO token for testing purposes.
 * This contract simulates the basic ERC20 functionality of CELO
 * while allowing for minting and burning in test environments.
 */
contract MockCELO is ERC20, Ownable {
    // Track validators for PoS simulation (simplified)
    mapping(address => bool) public validators;
    
    constructor() ERC20("Celo Native Asset", "CELO") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @dev Mints new tokens to the specified address.
     * In production CELO, new tokens are minted through the protocol's
     * consensus mechanism, but for testing we use a simple mint function.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens from the sender's balance.
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Registers an address as a validator (simplified PoS simulation)
     */
    function registerValidator(address validator) public onlyOwner {
        validators[validator] = true;
    }
    
    /**
     * @dev Removes an address from the validator set
     */
    function removeValidator(address validator) public onlyOwner {
        validators[validator] = false;
    }
    
    /**
     * @dev Checks if an address is a validator
     */
    function isValidator(address account) public view returns (bool) {
        return validators[account];
    }
    
    /**
     * @dev Simulates staking CELO (simplified)
     * In production, this would lock tokens in the protocol's staking mechanism
     */
    function simulateStaking(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance for staking");
        // In a real implementation, this would transfer tokens to a staking contract
        // For our mock, we just emit an event
        emit Transfer(msg.sender, address(this), amount);
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Simulates unstaking CELO (simplified)
     */
    function simulateUnstaking(uint256 amount) public {
        // In a real implementation, this would check the user's staked balance
        // For our mock, we just mint new tokens to simulate the return of staked tokens
        _mint(msg.sender, amount);
        emit Transfer(address(this), msg.sender, amount);
    }
} 