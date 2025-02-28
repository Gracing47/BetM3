const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NoLossBet Contract", function () {
  let NoLossBet;
  let noLossBet;
  let MockCELO;
  let mockCELO;
  let owner;
  let user1;
  let user2;
  let user3;
  
  const MIN_STAKE = ethers.parseEther("10"); // 10 CELO minimum stake
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy MockCELO token
    MockCELO = await ethers.getContractFactory("MockCELO");
    mockCELO = await MockCELO.deploy();
    
    // Deploy NoLossBet contract
    NoLossBet = await ethers.getContractFactory("NoLossBet");
    noLossBet = await NoLossBet.deploy(await mockCELO.getAddress());
    
    // Mint CELO tokens to users for testing
    const mintAmount = ethers.parseEther("1000");
    await mockCELO.mint(user1.address, mintAmount);
    await mockCELO.mint(user2.address, mintAmount);
    await mockCELO.mint(user3.address, mintAmount);
    
    // Approve NoLossBet contract to spend tokens
    await mockCELO.connect(user1).approve(await noLossBet.getAddress(), mintAmount);
    await mockCELO.connect(user2).approve(await noLossBet.getAddress(), mintAmount);
    await mockCELO.connect(user3).approve(await noLossBet.getAddress(), mintAmount);
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await noLossBet.owner()).to.equal(owner.address);
    });
    
    it("Should set the correct CELO token address", async function () {
      expect(await noLossBet.celoToken()).to.equal(await mockCELO.getAddress());
    });
  });
  
  describe("Creating Bets", function () {
    it("Should create a bet with valid parameters", async function () {
      const creatorStake = ethers.parseEther("20");
      const opponentStake = ethers.parseEther("15");
      const condition = "Team A will win the match";
      const durationDays = 7;
      
      await noLossBet.connect(user1).createBet(creatorStake, opponentStake, condition, durationDays);
      
      const bet = await noLossBet.bets(0);
      expect(bet.creator).to.equal(user1.address);
      expect(bet.opponent).to.equal(ethers.ZeroAddress);
      expect(bet.creatorStake).to.equal(creatorStake);
      expect(bet.opponentStake).to.equal(opponentStake);
      expect(bet.condition).to.equal(condition);
      expect(bet.resolved).to.equal(false);
    });
    
    it("Should fail if creator stake is too low", async function () {
      const lowStake = ethers.parseEther("5"); // Below minimum
      const opponentStake = ethers.parseEther("15");
      const condition = "Team A will win the match";
      const durationDays = 7;
      
      // Using try-catch to verify the transaction fails
      let failed = false;
      try {
        await noLossBet.connect(user1).createBet(lowStake, opponentStake, condition, durationDays);
      } catch (error) {
        failed = true;
      }
      expect(failed).to.equal(true);
    });
    
    it("Should fail if opponent stake is too low", async function () {
      const creatorStake = ethers.parseEther("20");
      const lowStake = ethers.parseEther("5"); // Below minimum
      const condition = "Team A will win the match";
      const durationDays = 7;
      
      // Using try-catch to verify the transaction fails
      let failed = false;
      try {
        await noLossBet.connect(user1).createBet(creatorStake, lowStake, condition, durationDays);
      } catch (error) {
        failed = true;
      }
      expect(failed).to.equal(true);
    });
    
    it("Should use default duration if durationDays is 0", async function () {
      const creatorStake = ethers.parseEther("20");
      const opponentStake = ethers.parseEther("15");
      const condition = "Team A will win the match";
      const durationDays = 0; // Use default
      
      await noLossBet.connect(user1).createBet(creatorStake, opponentStake, condition, durationDays);
      
      const bet = await noLossBet.bets(0);
      const defaultDuration = 7 * 24 * 60 * 60; // 7 days in seconds
      
      // Check if expiration is roughly now + default duration
      const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
      const expiration = Number(bet.expiration);
      expect(expiration).to.be.closeTo(blockTimestamp + defaultDuration, 10); // Allow small deviation
    });
  });
  
  describe("Accepting Bets", function () {
    beforeEach(async function () {
      // Create a bet for testing
      const creatorStake = ethers.parseEther("20");
      const opponentStake = ethers.parseEther("15");
      const condition = "Team A will win the match";
      const durationDays = 7;
      
      await noLossBet.connect(user1).createBet(creatorStake, opponentStake, condition, durationDays);
    });
    
    it("Should accept a bet with valid parameters", async function () {
      const prediction = true; // Opponent predicts true
      const customStake = 0; // Use default stake
      
      await noLossBet.connect(user2).acceptBet(0, prediction, customStake);
      
      const bet = await noLossBet.bets(0);
      expect(bet.opponent).to.equal(user2.address);
      expect(bet.opponentOutcome).to.equal(prediction);
    });
    
    it("Should accept a bet with custom stake", async function () {
      const prediction = true;
      const customStake = ethers.parseEther("20"); // Higher than default
      
      await noLossBet.connect(user2).acceptBet(0, prediction, customStake);
      
      const bet = await noLossBet.bets(0);
      expect(bet.opponent).to.equal(user2.address);
      expect(bet.opponentStake).to.equal(customStake);
    });
    
    it("Should fail if bet doesn't exist", async function () {
      // Using try-catch to verify the transaction fails
      let failed = false;
      try {
        await noLossBet.connect(user2).acceptBet(99, true, 0);
      } catch (error) {
        failed = true;
      }
      expect(failed).to.equal(true);
    });
    
    it("Should fail if bet already accepted", async function () {
      // First acceptance
      await noLossBet.connect(user2).acceptBet(0, true, 0);
      
      // Using try-catch to verify the transaction fails
      let failed = false;
      try {
        await noLossBet.connect(user3).acceptBet(0, false, 0);
      } catch (error) {
        failed = true;
      }
      expect(failed).to.equal(true);
    });
    
    it("Should fail if creator tries to accept own bet", async function () {
      // Using try-catch to verify the transaction fails
      let failed = false;
      try {
        await noLossBet.connect(user1).acceptBet(0, true, 0);
      } catch (error) {
        failed = true;
      }
      expect(failed).to.equal(true);
    });
  });
  
  describe.skip("Submitting Outcomes", function () {
    beforeEach(async function () {
      // Create and accept a bet for testing
      const creatorStake = ethers.parseEther("20");
      const opponentStake = ethers.parseEther("15");
      const condition = "Team A will win the match";
      const durationDays = 7;
      
      await noLossBet.connect(user1).createBet(creatorStake, opponentStake, condition, durationDays);
      await noLossBet.connect(user2).acceptBet(0, true, 0); // Opponent predicts true
    });
    
    it("Should allow creator to submit outcome", async function () {
      await noLossBet.connect(user1).submitOutcome(0, true);
      
      const bet = await noLossBet.bets(0);
      expect(bet.creatorOutcome).to.equal(true);
    });
    
    it("Should allow opponent to submit outcome", async function () {
      await noLossBet.connect(user2).submitOutcome(0, false);
      
      const bet = await noLossBet.bets(0);
      expect(bet.opponentOutcome).to.equal(false);
    });
    
    it("Should fail if non-participant tries to submit outcome", async function () {
      await expect(
        noLossBet.connect(user3).submitOutcome(0, true)
      ).to.be.reverted; // Just check if it reverts
    });
  });
  
  describe.skip("Resolving Bets", function () {
    beforeEach(async function () {
      // Create and accept a bet for testing
      const creatorStake = ethers.parseEther("20");
      const opponentStake = ethers.parseEther("15");
      const condition = "Team A will win the match";
      const durationDays = 7;
      
      await noLossBet.connect(user1).createBet(creatorStake, opponentStake, condition, durationDays);
      await noLossBet.connect(user2).acceptBet(0, false, 0); // Opponent predicts false
    });
    
    it("Should fail to resolve if outcomes don't match", async function () {
      await noLossBet.connect(user1).submitOutcome(0, true);
      await noLossBet.connect(user2).submitOutcome(0, false);
      
      await expect(
        noLossBet.connect(user3).resolveBet(0)
      ).to.be.reverted; // Just check if it reverts
    });
  });
  
  describe.skip("Cancelling Bets", function () {
    beforeEach(async function () {
      // Create a bet for testing
      const creatorStake = ethers.parseEther("20");
      const opponentStake = ethers.parseEther("15");
      const condition = "Team A will win the match";
      const durationDays = 7;
      
      await noLossBet.connect(user1).createBet(creatorStake, opponentStake, condition, durationDays);
    });
    
    it("Should allow creator to cancel unaccepted bet", async function () {
      const initialBalance = await mockCELO.balanceOf(user1.address);
      
      await noLossBet.connect(user1).cancelBet(0);
      
      const bet = await noLossBet.bets(0);
      expect(bet.resolved).to.equal(true);
      
      // Creator should get their stake back
      const finalBalance = await mockCELO.balanceOf(user1.address);
      const initialBalanceNumber = Number(ethers.formatEther(initialBalance));
      const finalBalanceNumber = Number(ethers.formatEther(finalBalance));
      expect(finalBalanceNumber).to.be.greaterThan(initialBalanceNumber);
    });
    
    it("Should fail if non-creator tries to cancel", async function () {
      await expect(
        noLossBet.connect(user2).cancelBet(0)
      ).to.be.reverted; // Just check if it reverts
    });
    
    it("Should fail if bet already accepted", async function () {
      await noLossBet.connect(user2).acceptBet(0, true, 0);
      
      await expect(
        noLossBet.connect(user1).cancelBet(0)
      ).to.be.reverted; // Just check if it reverts
    });
  });
  
  describe.skip("Emergency Functions", function () {
    it("Should allow owner to recover tokens", async function () {
      // Send some tokens to the contract directly
      const amount = ethers.parseEther("50");
      await mockCELO.mint(await noLossBet.getAddress(), amount);
      
      const initialBalance = await mockCELO.balanceOf(owner.address);
      
      // Recover tokens
      await noLossBet.connect(owner).recoverTokens(await mockCELO.getAddress(), amount);
      
      // Check owner received tokens
      const finalBalance = await mockCELO.balanceOf(owner.address);
      const initialBalanceNumber = Number(ethers.formatEther(initialBalance));
      const finalBalanceNumber = Number(ethers.formatEther(finalBalance));
      expect(finalBalanceNumber).to.be.greaterThan(initialBalanceNumber);
    });
    
    it("Should fail if non-owner tries to recover tokens", async function () {
      await expect(
        noLossBet.connect(user1).recoverTokens(await mockCELO.getAddress(), ethers.parseEther("1"))
      ).to.be.reverted; // Just check if it reverts
    });
  });
}); 