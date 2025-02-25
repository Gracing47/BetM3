// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableBurnableToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}

contract AavePoolMock {
    IMintableBurnableToken public token;
    mapping(address => uint256) public balances;
    int256 public yieldRate = 10; // 10% yield by default, can be negative for testing

    constructor(address _token) {
        token = IMintableBurnableToken(_token);
    }

    // Set the yield rate (in percentage, can be negative)
    function setYieldRate(int256 _yieldRate) external {
        yieldRate = _yieldRate;
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external {
        require(asset == address(token), "Invalid token");
        token.transferFrom(msg.sender, address(this), amount);
        balances[onBehalfOf] += amount;
    }

    // Simulate market loss by burning tokens
    function simulateMarketLoss(uint256 lossPercentage) external {
        uint256 totalBalance = token.balanceOf(address(this));
        uint256 lossAmount = (totalBalance * lossPercentage) / 100;
        
        // Burn tokens to simulate loss
        try token.burn(lossAmount) {
            // Successfully burned tokens
        } catch {
            // If burn is not available, we can transfer to a dead address
            token.transfer(address(0x000000000000000000000000000000000000dEaD), lossAmount);
        }
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(asset == address(token), "Invalid token");
        uint256 balance = balances[msg.sender];
        
        // If amount is max uint256, withdraw everything
        if (amount == type(uint256).max) {
            amount = balance;
        }
        
        require(amount <= balance, "Insufficient balance");
        
        // Calculate yield (can be negative)
        int256 yieldAmount = (int256(amount) * yieldRate) / 100;
        uint256 totalAmount;
        
        if (yieldAmount >= 0) {
            // Positive yield - mint additional tokens if needed
            totalAmount = amount + uint256(yieldAmount);
            uint256 currentBalance = token.balanceOf(address(this));
            if (currentBalance < totalAmount) {
                // Mint additional tokens to cover the yield
                try token.mint(address(this), totalAmount - currentBalance) {
                    // Successfully minted tokens
                } catch {
                    // If minting fails, adjust totalAmount to available balance
                    totalAmount = currentBalance;
                }
            }
        } else {
            // Negative yield - ensure we don't underflow
            uint256 absYieldAmount = uint256(-yieldAmount);
            totalAmount = amount > absYieldAmount ? amount - absYieldAmount : amount;
        }
        
        balances[msg.sender] -= amount;
        
        // Transfer principal + yield (or principal - loss)
        token.transfer(to, totalAmount);
        
        return totalAmount;
    }
} 