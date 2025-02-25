// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AavePoolMock {
    IERC20 public token;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        token.transferFrom(msg.sender, address(this), amount);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        uint256 balance = token.balanceOf(address(this));
        uint256 yield = balance * 5 / 100; // Simulierter 5% Yield
        token.transfer(to, balance + yield);
        return balance + yield;
    }
} 