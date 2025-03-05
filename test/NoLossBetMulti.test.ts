import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
const { ethers } = hre;

describe("NoLossBetMulti Contract", function () {
  let cUSDToken: any;
  let bettingManagerFactory: any;
  let noLossBetMulti: any;
  let owner: HardhatEthersSigner;
  let participant1: HardhatEthersSigner;
  let participant2: HardhatEthersSigner;
  let participant3: HardhatEthersSigner;
  let participant4: HardhatEthersSigner;

  const initialSupply = ethers.parseEther("1000000");
  const userBalance = ethers.parseEther("10000");
  const minStake = ethers.parseEther("10");

  beforeEach(async function () {
    // Get signers
    [owner, participant1, participant2, participant3, participant4] = await ethers.getSigners();

    // Deploy cUSDToken
    const CUSDTokenFactory = await ethers.getContractFactory("cUSDToken");
    cUSDToken = await CUSDTokenFactory.deploy();

    // Deploy BettingManagerFactory
    const BettingManagerFactoryFactory = await ethers.getContractFactory("BettingManagerFactory");
    bettingManagerFactory = await BettingManagerFactoryFactory.deploy();

    // Create a betting contract instance through the factory
    // @ts-ignore
    const createTx = await bettingManagerFactory.createBettingContract(await cUSDToken.getAddress());
    const receipt = await createTx.wait();
    
    // Extract the betting contract address from event logs
    const event = receipt?.logs[0];
    // @ts-ignore
    const bettingContractAddress = bettingManagerFactory.interface.parseLog({
      topics: event?.topics as string[],
      data: event?.data as string
    })?.args[0];
    
    // Get the NoLossBetMulti contract
    const NoLossBetMultiFactory = await ethers.getContractFactory("NoLossBetMulti");
    noLossBetMulti = NoLossBetMultiFactory.attach(bettingContractAddress);

    // Mint tokens for testing
    // @ts-ignore
    await cUSDToken.mint(participant1.address, userBalance);
    // @ts-ignore
    await cUSDToken.mint(participant2.address, userBalance);
    // @ts-ignore
    await cUSDToken.mint(participant3.address, userBalance);
    // @ts-ignore
    await cUSDToken.mint(participant4.address, userBalance);

    // Approve token spending
    // @ts-ignore
    await cUSDToken.approve(bettingContractAddress, userBalance);
    // @ts-ignore
    await cUSDToken.connect(participant1).approve(bettingContractAddress, userBalance);
    // @ts-ignore
    await cUSDToken.connect(participant2).approve(bettingContractAddress, userBalance);
    // @ts-ignore
    await cUSDToken.connect(participant3).approve(bettingContractAddress, userBalance);
    // @ts-ignore
    await cUSDToken.connect(participant4).approve(bettingContractAddress, userBalance);
  });

  describe("Deployment", function () {
    it("Should set the right token address", async function () {
      // @ts-ignore
      expect(await noLossBetMulti.token()).to.equal(await cUSDToken.getAddress());
    });

    it("Should set the right owner", async function () {
      // @ts-ignore
      expect(await noLossBetMulti.owner()).to.equal(owner.address);
    });

    it("Should set the default yield rate", async function () {
      // @ts-ignore
      expect(await noLossBetMulti.yieldRate()).to.equal(5);
    });
  });

  describe("Bet Creation and Joining", function () {
    it("Should create a bet with correct parameters", async function () {
      const betCondition = "Will Celo reach $10 by the end of the month?";
      const stake = ethers.parseEther("100");
      const durationDays = 7;
      const creatorPrediction = true;

      // @ts-ignore
      await noLossBetMulti.createBet(stake, betCondition, durationDays, creatorPrediction);
      
      // @ts-ignore
      const betDetails = await noLossBetMulti.getBetDetails(0);
      expect(betDetails[0]).to.equal(owner.address); // creator
      expect(betDetails[1]).to.equal(betCondition); // condition
      expect(betDetails[3]).to.equal(false); // resolved
      expect(betDetails[4]).to.equal(stake); // totalStakeTrue
      expect(betDetails[5]).to.equal(0); // totalStakeFalse
    });

    it("Should fail if stake is below minimum", async function () {
      const betCondition = "Will Celo reach $10 by the end of the month?";
      const belowMinStake = ethers.parseEther("1"); // Below MIN_STAKE
      const durationDays = 7;
      const creatorPrediction = true;

      await expect(
        // @ts-ignore
        noLossBetMulti.createBet(belowMinStake, betCondition, durationDays, creatorPrediction)
      ).to.be.rejectedWith("Stake is below minimum requirement");
    });

    it("Should allow others to join a bet", async function () {
      // Create a bet first
      const betCondition = "Will Celo reach $10 by the end of the month?";
      const creatorStake = ethers.parseEther("100");
      const durationDays = 7;
      const creatorPrediction = true;

      // @ts-ignore
      await noLossBetMulti.createBet(creatorStake, betCondition, durationDays, creatorPrediction);
      
      // Participant 1 joins with TRUE prediction
      const stake1 = ethers.parseEther("50");
      // @ts-ignore
      await noLossBetMulti.connect(participant1).joinBet(0, stake1, true);
      
      // Participant 2 joins with FALSE prediction
      const stake2 = ethers.parseEther("75");
      // @ts-ignore
      await noLossBetMulti.connect(participant2).joinBet(0, stake2, false);
      
      // @ts-ignore
      const betDetails = await noLossBetMulti.getBetDetails(0);
      expect(betDetails[4]).to.equal(creatorStake + stake1); // totalStakeTrue
      expect(betDetails[5]).to.equal(stake2); // totalStakeFalse
    });

    it("Should not allow joining an expired bet", async function () {
      // Create a bet with 1 day duration
      const betCondition = "Will Celo reach $10 tomorrow?";
      const creatorStake = ethers.parseEther("100");
      const durationDays = 1;
      const creatorPrediction = true;

      // @ts-ignore
      await noLossBetMulti.createBet(creatorStake, betCondition, durationDays, creatorPrediction);
      
      // Advance time by 1 day and 1 second (to expire the bet)
      await ethers.provider.send("evm_increaseTime", [1 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Try to join after expiration
      const stake = ethers.parseEther("50");
      await expect(
        // @ts-ignore
        noLossBetMulti.connect(participant1).joinBet(0, stake, true)
      ).to.be.rejectedWith("Bet has already expired");
    });
  });

  describe("Resolution Phase", function () {
    beforeEach(async function () {
      // Create a bet with typical participants
      const betCondition = "Will Celo reach $10 by the end of the month?";
      const creatorStake = ethers.parseEther("100");
      const durationDays = 7;
      const creatorPrediction = true;

      // @ts-ignore
      await noLossBetMulti.createBet(creatorStake, betCondition, durationDays, creatorPrediction);
      
      // Participant 1 joins with TRUE prediction (same as creator)
      const stake1 = ethers.parseEther("50");
      // @ts-ignore
      await noLossBetMulti.connect(participant1).joinBet(0, stake1, true);
      
      // Participant 2 joins with FALSE prediction
      const stake2 = ethers.parseEther("75");
      // @ts-ignore
      await noLossBetMulti.connect(participant2).joinBet(0, stake2, false);
      
      // Participant 3 joins with TRUE prediction
      const stake3 = ethers.parseEther("60");
      // @ts-ignore
      await noLossBetMulti.connect(participant3).joinBet(0, stake3, true);
    });

    it("Should not allow voting before expiration", async function () {
      await expect(
        // @ts-ignore
        noLossBetMulti.submitResolutionOutcome(0, true)
      ).to.be.rejectedWith("Bet is not expired yet");
    });

    it("Should allow voting after expiration", async function () {
      // Advance time to after bet expiration
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Creator votes
      // @ts-ignore
      await noLossBetMulti.submitResolutionOutcome(0, true);
      
      // Participant 1 votes
      // @ts-ignore
      await noLossBetMulti.connect(participant1).submitResolutionOutcome(0, true);
      
      // Participant 2 votes
      // @ts-ignore
      await noLossBetMulti.connect(participant2).submitResolutionOutcome(0, false);
    });

    it("Should require participants to vote according to their prediction", async function () {
      // Advance time to after bet expiration
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Participant 1 tries to vote FALSE (but joined with TRUE)
      await expect(
        // @ts-ignore
        noLossBetMulti.connect(participant1).submitResolutionOutcome(0, false)
      ).to.be.rejectedWith("Must vote 'true' because you joined the 'true' side");
      
      // Participant 2 tries to vote TRUE (but joined with FALSE)
      await expect(
        // @ts-ignore
        noLossBetMulti.connect(participant2).submitResolutionOutcome(0, true)
      ).to.be.rejectedWith("Must vote 'false' because you joined the 'false' side");
    });
  });

  describe("Bet Resolution", function () {
    beforeEach(async function () {
      // Create a bet with typical participants
      const betCondition = "Will Celo reach $10 by the end of the month?";
      const creatorStake = ethers.parseEther("100");
      const durationDays = 7;
      const creatorPrediction = true;

      // @ts-ignore
      await noLossBetMulti.createBet(creatorStake, betCondition, durationDays, creatorPrediction);
      
      // Participant 1 joins with TRUE prediction (creating >80% majority for TRUE)
      const stake1 = ethers.parseEther("350");
      // @ts-ignore
      await noLossBetMulti.connect(participant1).joinBet(0, stake1, true);
      
      // Participant 2 joins with FALSE prediction
      const stake2 = ethers.parseEther("75");
      // @ts-ignore
      await noLossBetMulti.connect(participant2).joinBet(0, stake2, false);
      
      // Advance time to after bet expiration
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Participants vote
      // @ts-ignore
      await noLossBetMulti.submitResolutionOutcome(0, true);
      // @ts-ignore
      await noLossBetMulti.connect(participant1).submitResolutionOutcome(0, true);
      // @ts-ignore
      await noLossBetMulti.connect(participant2).submitResolutionOutcome(0, false);
      
      // Advance time past resolution period
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should allow automatic resolution with supermajority", async function () {
      // TRUE side has >80% of the total stake, should auto-resolve
      // @ts-ignore
      await noLossBetMulti.finalizeResolution(0);
      
      // @ts-ignore
      const betDetails = await noLossBetMulti.getBetDetails(0);
      expect(betDetails[3]).to.equal(true); // resolved
      expect(betDetails[6]).to.equal(true); // resolutionFinalized
      expect(betDetails[7]).to.equal(true); // winningOutcome (TRUE)
    });

    it("Should distribute yields correctly to winners and losers", async function () {
      // Get balances before resolution
      // @ts-ignore
      const owner_before = await cUSDToken.balanceOf(owner.address);
      // @ts-ignore
      const participant1_before = await cUSDToken.balanceOf(participant1.address);
      // @ts-ignore
      const participant2_before = await cUSDToken.balanceOf(participant2.address);
      
      // Finalize the bet resolution
      // @ts-ignore
      await noLossBetMulti.finalizeResolution(0);
      
      // Get balances after resolution
      // @ts-ignore
      const owner_after = await cUSDToken.balanceOf(owner.address);
      // @ts-ignore
      const participant1_after = await cUSDToken.balanceOf(participant1.address);
      // @ts-ignore
      const participant2_after = await cUSDToken.balanceOf(participant2.address);
      
      // Calculate changes
      const owner_diff = owner_after - owner_before;
      const participant1_diff = participant1_after - participant1_before;
      const participant2_diff = participant2_after - participant2_before;
      
      // Total stake
      const creatorStake = ethers.parseEther("100");
      const stake1 = ethers.parseEther("350");
      const stake2 = ethers.parseEther("75");
      const totalStake = creatorStake + stake1 + stake2;
      
      // Yield calculations (5% default yield rate)
      const simulatedYield = (totalStake * BigInt(5)) / BigInt(100);
      const yieldForWinners = (simulatedYield * BigInt(80)) / BigInt(100);
      const yieldForLosers = simulatedYield - yieldForWinners;
      
      // TRUE side wins
      const totalTrueStake = creatorStake + stake1;
      
      // Owner should get their stake back plus a proportion of winner yield
      const ownerBonus = (creatorStake * yieldForWinners) / totalTrueStake;
      expect(owner_diff).to.be.closeTo(creatorStake + ownerBonus, ethers.parseEther("0.01"));
      
      // Participant 1 should get their stake back plus a proportion of winner yield
      const participant1Bonus = (stake1 * yieldForWinners) / totalTrueStake;
      expect(participant1_diff).to.be.closeTo(stake1 + participant1Bonus, ethers.parseEther("0.01"));
      
      // Participant 2 (loser) should get their stake back plus a proportion of loser yield
      const participant2Bonus = yieldForLosers; // Only one loser, gets all loser yield
      expect(participant2_diff).to.be.closeTo(stake2 + participant2Bonus, ethers.parseEther("0.01"));
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to set the yield rate", async function () {
      // @ts-ignore
      await noLossBetMulti.setYieldRate(10);
      // @ts-ignore
      expect(await noLossBetMulti.yieldRate()).to.equal(10);
    });

    it("Should not allow non-owner to set the yield rate", async function () {
      await expect(
        // @ts-ignore
        noLossBetMulti.connect(participant1).setYieldRate(10)
      ).to.be.rejectedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to manually resolve a bet", async function () {
      // Create a simple bet
      const betCondition = "Will Celo reach $10 by the end of the month?";
      const creatorStake = ethers.parseEther("100");
      const durationDays = 7;
      const creatorPrediction = true;

      // @ts-ignore
      await noLossBetMulti.createBet(creatorStake, betCondition, durationDays, creatorPrediction);
      
      // Advance time past expiration and resolution period
      await ethers.provider.send("evm_increaseTime", [(7 * 24 * 60 * 60) + (24 * 60 * 60) + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Owner manually resolves the bet
      // @ts-ignore
      await noLossBetMulti.adminFinalizeResolution(0, false, false); // FALSE wins
      
      // @ts-ignore
      const betDetails = await noLossBetMulti.getBetDetails(0);
      expect(betDetails[3]).to.equal(true); // resolved
      expect(betDetails[6]).to.equal(true); // resolutionFinalized
      expect(betDetails[7]).to.equal(false); // winningOutcome (FALSE)
    });

    it("Should allow owner to cancel a bet", async function () {
      // Create a simple bet
      const betCondition = "Will Celo reach $10 by the end of the month?";
      const creatorStake = ethers.parseEther("100");
      const durationDays = 7;
      const creatorPrediction = true;

      // @ts-ignore
      await noLossBetMulti.createBet(creatorStake, betCondition, durationDays, creatorPrediction);
      
      // Advance time past expiration
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Owner cancels the bet
      // @ts-ignore
      await noLossBetMulti.adminFinalizeResolution(0, false, true); // cancel = true
      
      // @ts-ignore
      const betDetails = await noLossBetMulti.getBetDetails(0);
      expect(betDetails[3]).to.equal(true); // resolved
      expect(betDetails[6]).to.equal(true); // resolutionFinalized
    });
  });
}); 