// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BetM3Token is ERC20Capped, Ownable {
    // Emissions rate per block for staking rewards
    uint256 public emissionRate = 100 * 10**18; // 100 tokens per block
    
    constructor() ERC20("BetM3", "BM3") ERC20Capped(47000000 * 10**18) {
        // Mint initial supply for liquidity and staking rewards
        _mint(msg.sender, 1000000 * 10**18); // 1 million tokens
    }
    
    function setEmissionRate(uint256 _newRate) external onlyOwner {
        emissionRate = _newRate;
    }

    /**
     * @dev Allows the owner to mint new tokens up to the maximum cap.
     * @param _to Address to receive tokens.
     * @param _amount Amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
