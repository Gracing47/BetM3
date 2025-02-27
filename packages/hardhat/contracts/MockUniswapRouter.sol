// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockUniswapRouter
 * @dev A simplified mock of Uniswap V2 Router for testing the NoLossBet contract
 */
contract MockUniswapRouter {
    // Events to track function calls
    event LiquidityAdded(
        address tokenA,
        address tokenB,
        uint amountA,
        uint amountB,
        uint liquidity
    );
    
    event LiquidityRemoved(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountA,
        uint amountB
    );
    
    // To simulate actual token transfers in tests
    mapping(address => mapping(address => uint256)) public transferredAmounts;
    
    function simulateTransferToUser(address token, address user, uint256 amount) external {
        transferredAmounts[token][user] += amount;
    }
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        // In a real implementation, this would transfer tokens from the caller
        // For testing, we just accept the approval and record the event
        
        // For testing purposes, we'll return the exact amounts desired and a fixed liquidity amount
        amountA = amountADesired;
        amountB = amountBDesired;
        liquidity = amountADesired; // Simplified: 1:1 between token amount and LP tokens
        
        // Transfer tokens from sender to this contract (in a real implementation)
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        
        emit LiquidityAdded(tokenA, tokenB, amountA, amountB, liquidity);
        
        return (amountA, amountB, liquidity);
    }
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB) {
        // For testing, just return the exact amount of tokens that were added
        // This avoids the "exceeds balance" error since we're not trying to return more than we have
        amountA = liquidity;
        amountB = liquidity;
        
        // Transfer tokens to recipient - make sure we have the tokens to transfer
        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);
        
        emit LiquidityRemoved(tokenA, tokenB, liquidity, amountA, amountB);
        
        return (amountA, amountB);
    }
} 