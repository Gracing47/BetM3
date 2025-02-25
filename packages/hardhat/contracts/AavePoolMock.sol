// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AavePoolMock {
    IERC20 public token;
    mapping(address => uint256) public balances;
    uint256 public yieldRate = 10; // 10% yield by default

    constructor(address _token) {
        token = IERC20(_token);
    }

    // Set the yield rate (in percentage)
    function setYieldRate(uint256 _yieldRate) external {
        yieldRate = _yieldRate;
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external {
        require(asset == address(token), "Invalid token");
        token.transferFrom(msg.sender, address(this), amount);
        balances[onBehalfOf] += amount;
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(asset == address(token), "Invalid token");
        uint256 balance = balances[msg.sender];
        
        // If amount is max uint256, withdraw everything
        if (amount == type(uint256).max) {
            amount = balance;
        }
        
        require(amount <= balance, "Insufficient balance");
        
        // Calculate yield
        uint256 yieldAmount = (amount * yieldRate) / 100;
        uint256 totalAmount = amount + yieldAmount;
        
        balances[msg.sender] -= amount;
        
        // Transfer principal + yield
        token.transfer(to, totalAmount);
        
        return totalAmount;
    }
} 