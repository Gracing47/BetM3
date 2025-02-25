const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockCELO", function () {
  let MockCELO;
  let celoToken;
  let owner;
  let user1;
  let user2;
  let validator;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, validator] = await ethers.getSigners();

    // Deploy MockCELO
    MockCELO = await ethers.getContractFactory("MockCELO");
    celoToken = await MockCELO.deploy();
    await celoToken.waitForDeployment();
    
    // Mint some tokens to users for testing
    await celoToken.mint(user1.address, ethers.parseEther("1000"));
    await celoToken.mint(user2.address, ethers.parseEther("1000"));
  });

  describe("Basic ERC20 Functionality", function () {
    it("Should have the correct name and symbol", async function () {
      expect(await celoToken.name()).to.equal("Celo Native Asset");
      expect(await celoToken.symbol()).to.equal("CELO");
    });

    it("Should allow transfers between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      
      // Initial balances
      const initialUser1Balance = await celoToken.balanceOf(user1.address);
      const initialUser2Balance = await celoToken.balanceOf(user2.address);
      
      // Transfer from user1 to user2
      await celoToken.connect(user1).transfer(user2.address, transferAmount);
      
      // Check balances after transfer
      expect(await celoToken.balanceOf(user1.address)).to.equal(initialUser1Balance - transferAmount);
      expect(await celoToken.balanceOf(user2.address)).to.equal(initialUser2Balance + transferAmount);
    });
  });

  describe("CELO-specific Functionality", function () {
    it("Should register and track validators", async function () {
      // Initially not a validator
      expect(await celoToken.isValidator(validator.address)).to.be.false;
      
      // Register as validator
      await celoToken.registerValidator(validator.address);
      expect(await celoToken.isValidator(validator.address)).to.be.true;
      
      // Remove validator
      await celoToken.removeValidator(validator.address);
      expect(await celoToken.isValidator(validator.address)).to.be.false;
    });

    it("Should simulate staking and unstaking", async function () {
      const stakeAmount = ethers.parseEther("100");
      
      // Initial balance
      const initialBalance = await celoToken.balanceOf(user1.address);
      
      // Stake CELO
      await celoToken.connect(user1).simulateStaking(stakeAmount);
      
      // Check balance after staking
      expect(await celoToken.balanceOf(user1.address)).to.equal(initialBalance - stakeAmount);
      
      // Unstake CELO
      await celoToken.connect(user1).simulateUnstaking(stakeAmount);
      
      // Check balance after unstaking
      expect(await celoToken.balanceOf(user1.address)).to.equal(initialBalance);
    });

    it("Should not allow staking more than balance", async function () {
      const excessiveAmount = ethers.parseEther("2000"); // More than user1's balance
      
      // Attempt to stake more than balance should fail
      let errorOccurred = false;
      let errorMessage = "";
      
      try {
        await celoToken.connect(user1).simulateStaking(excessiveAmount);
      } catch (error) {
        errorOccurred = true;
        errorMessage = error.message;
      }
      
      expect(errorOccurred).to.be.true;
      expect(errorMessage).to.include("Insufficient balance for staking");
    });
  });
}); 