const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockUniswapRouter", function () {
  let mockUniswapRouter;
  let token0;
  let token1;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock tokens for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token0 = await MockERC20.deploy("Token A", "TKNA", ethers.parseEther("10000"));
    token1 = await MockERC20.deploy("Token B", "TKNB", ethers.parseEther("10000"));

    // Deploy the mock router
    const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
    mockUniswapRouter = await MockUniswapRouter.deploy();

    // Mint some tokens to the user
    await token0.mint(user.address, ethers.parseEther("1000"));
    await token1.mint(user.address, ethers.parseEther("1000"));

    // Approve router to use tokens
    await token0.connect(user).approve(mockUniswapRouter.target, ethers.parseEther("1000"));
    await token1.connect(user).approve(mockUniswapRouter.target, ethers.parseEther("1000"));
  });

  it("Should return simulated values for addLiquidity", async function () {
    const amountA = ethers.parseEther("10");
    const amountB = ethers.parseEther("20");
    
    const initialToken0Balance = await token0.balanceOf(mockUniswapRouter.target);
    const initialToken1Balance = await token0.balanceOf(mockUniswapRouter.target);
    
    // Call addLiquidity
    const tx = await mockUniswapRouter.connect(user).addLiquidity(
      token0.target,
      token1.target,
      amountA,
      amountB,
      0,
      0,
      user.address,
      Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    );
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    // Verify tokens were transferred to the router
    const finalToken0Balance = await token0.balanceOf(mockUniswapRouter.target);
    const finalToken1Balance = await token1.balanceOf(mockUniswapRouter.target);
    
    expect(finalToken0Balance > initialToken0Balance).to.be.true;
    expect(finalToken1Balance > initialToken1Balance).to.be.true;
  });

  it("Should return simulated values for removeLiquidity", async function () {
    // First add liquidity so we have tokens in the router
    const amountA = ethers.parseEther("15");
    const amountB = ethers.parseEther("15");
    
    await mockUniswapRouter.connect(user).addLiquidity(
      token0.target,
      token1.target,
      amountA,
      amountB,
      0,
      0,
      mockUniswapRouter.target, // Send LP tokens to the router itself
      Math.floor(Date.now() / 1000) + 3600
    );
    
    // Now test removeLiquidity
    const userBalanceBefore = await token0.balanceOf(user.address);
    
    const tx = await mockUniswapRouter.connect(user).removeLiquidity(
      token0.target,
      token1.target,
      ethers.parseEther("15"), // liquidity amount
      0,  // minAmountA
      0, // minAmountB
      user.address,
      Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    );
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    // Verify tokens were transferred to the user
    const userBalanceAfter = await token0.balanceOf(user.address);
    expect(userBalanceAfter > userBalanceBefore).to.be.true;
  });

  it("Should allow simulating token transfers to users", async function () {
    const amount = ethers.parseEther("50");
    
    await mockUniswapRouter.simulateTransferToUser(token0.target, user.address, amount);
    
    const transferAmount = await mockUniswapRouter.transferredAmounts(token0.target, user.address);
    expect(transferAmount).to.equal(amount);
  });
}); 