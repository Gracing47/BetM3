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

  describe("Mint and Balance Functionality", function () {
    it("Should correctly mint tokens and update balances", async function () {
      // Create a new test address
      const [_, __, ___, ____, testUser] = await ethers.getSigners();
      
      // Check initial balance (should be 0)
      const initialBalance = await celoToken.balanceOf(testUser.address);
      console.log(`Initial balance: ${ethers.formatEther(initialBalance)} CELO`);
      
      // Mint tokens to the test user
      const mintAmount = ethers.parseEther("500");
      await celoToken.mint(testUser.address, mintAmount);
      console.log(`Minted ${ethers.formatEther(mintAmount)} CELO to ${testUser.address}`);
      
      // Check updated balance
      const newBalance = await celoToken.balanceOf(testUser.address);
      console.log(`New balance: ${ethers.formatEther(newBalance)} CELO`);
      
      // Verify the balance increased by the mint amount
      expect(newBalance).to.equal(initialBalance + mintAmount);
      
      // Mint more tokens
      const additionalAmount = ethers.parseEther("250");
      await celoToken.mint(testUser.address, additionalAmount);
      console.log(`Minted additional ${ethers.formatEther(additionalAmount)} CELO`);
      
      // Check final balance
      const finalBalance = await celoToken.balanceOf(testUser.address);
      console.log(`Final balance: ${ethers.formatEther(finalBalance)} CELO`);
      
      // Verify the final balance is correct
      expect(finalBalance).to.equal(initialBalance + mintAmount + additionalAmount);
    });
    
    it("Should allow only the owner to mint tokens", async function () {
      // Try to mint tokens from a non-owner account
      const nonOwnerMintAmount = ethers.parseEther("100");
      
      let errorOccurred = false;
      try {
        await celoToken.connect(user1).mint(user2.address, nonOwnerMintAmount);
      } catch (error) {
        errorOccurred = true;
      }
      
      expect(errorOccurred).to.be.true;
    });
  });
}); 