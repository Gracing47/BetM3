const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("NoLossBet Expiration Tests", function () {
  let NoLossBet, noLossBet, celoToken, betM3Token, aavePoolMock, owner, creator, opponent;
  const BET_DURATION = 14 * 24 * 60 * 60; // 14 days in seconds

  beforeEach(async function () {
    [owner, creator, opponent] = await ethers.getSigners();

    // Deploy BetM3Token
    const BetM3Token = await ethers.getContractFactory("packages/hardhat/contracts/BetM3Token.sol:BetM3Token");
    betM3Token = await BetM3Token.deploy();
    await betM3Token.waitForDeployment();
    
    // Deploy mock CELO Token (using BetM3Token for simplicity)
    const CeloToken = await ethers.getContractFactory("packages/hardhat/contracts/BetM3Token.sol:BetM3Token");
    celoToken = await CeloToken.deploy();
    await celoToken.waitForDeployment();
    
    // Mint tokens to users
    await celoToken.mint(creator.address, ethers.parseEther("1000"));
    await celoToken.mint(opponent.address, ethers.parseEther("1000"));
    await betM3Token.mint(owner.address, ethers.parseEther("1000")); // For rewards

    // Deploy Aave Pool Mock
    const AavePoolMock = await ethers.getContractFactory("packages/hardhat/contracts/AavePoolMock.sol:AavePoolMock");
    aavePoolMock = await AavePoolMock.deploy(await celoToken.getAddress());
    await aavePoolMock.waitForDeployment();

    // Deploy NoLossBet Contract
    NoLossBet = await ethers.getContractFactory("packages/hardhat/contracts/NoLossBet.sol:NoLossBet");
    noLossBet = await NoLossBet.deploy(
      await celoToken.getAddress(),
      await betM3Token.getAddress(),
      await aavePoolMock.getAddress()
    );
    await noLossBet.waitForDeployment();
    
    // Fund the NoLossBet contract with BetM3Tokens for rewards
    await betM3Token.approve(await noLossBet.getAddress(), ethers.parseEther("1000"));
    await noLossBet.fundCommunityPool(ethers.parseEther("100"));
  });

  describe("Bet Expiration", function() {
    it("should set the correct expiration time when creating a bet", async function () {
      // Get current timestamp
      const currentTimestamp = await time.latest();
      
      // Approve tokens for the bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      
      // Create a bet
      const tx = await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      const receipt = await tx.wait();
      
      // Check if the BetCreated event was emitted with correct expiration
      const betCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BetCreated'
      );
      expect(betCreatedEvent).to.not.be.undefined;
      
      // Get the expiration time from the event
      const expirationFromEvent = betCreatedEvent.args[3];
      
      // Check bet details
      const bet = await noLossBet.bets(0);
      expect(bet.expiration).to.equal(expirationFromEvent);
      
      // Check that expiration is approximately currentTimestamp + BET_DURATION
      // Allow for a small margin of error due to block time variations
      const expectedExpiration = BigInt(currentTimestamp) + BigInt(BET_DURATION);
      expect(Number(bet.expiration - expectedExpiration)).to.be.lessThan(10);
    });
    
    it("should not allow accepting an expired bet", async function () {
      // Create a bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      // Fast forward time to after expiration
      await time.increase(BET_DURATION + 1);
      
      // Try to accept the expired bet
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      
      // Should revert with "Bet has expired"
      let errorOccurred = false;
      try {
        await noLossBet.connect(opponent).acceptBet(0);
      } catch (error) {
        errorOccurred = true;
        expect(error.message).to.include("Bet has expired");
      }
      expect(errorOccurred).to.be.true;
    });
    
    it("should allow resolving an expired bet with matching outcomes", async function () {
      // Create and accept a bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      await noLossBet.connect(opponent).acceptBet(0);
      
      // Both submit same outcome
      await noLossBet.connect(creator).submitOutcome(0, true);
      await noLossBet.connect(opponent).submitOutcome(0, true);
      
      // Simulate some yield
      await celoToken.mint(await aavePoolMock.getAddress(), ethers.parseEther("15")); // 10% yield
      
      // Fast forward time to after expiration
      await time.increase(BET_DURATION + 1);
      
      // Resolve the bet
      const tx = await noLossBet.connect(creator).resolveBet(0);
      const receipt = await tx.wait();
      
      // Check if the BetResolved event was emitted
      const betResolvedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BetResolved'
      );
      expect(betResolvedEvent).to.not.be.undefined;
      
      // Check that bet is resolved
      const bet = await noLossBet.bets(0);
      expect(bet.resolved).to.be.true;
      
      // Check BetM3Token rewards - should be normal rewards since outcomes matched
      const creatorBetM3Balance = await betM3Token.balanceOf(creator.address);
      const opponentBetM3Balance = await betM3Token.balanceOf(opponent.address);
      
      expect(creatorBetM3Balance).to.equal(ethers.parseEther("10")); // 10 BETM3
      expect(opponentBetM3Balance).to.equal(ethers.parseEther("5")); // 5 BETM3
    });
    
    it("should allow resolving an expired bet with non-matching outcomes", async function () {
      // Create and accept a bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      await noLossBet.connect(opponent).acceptBet(0);
      
      // Submit different outcomes
      await noLossBet.connect(creator).submitOutcome(0, true);
      await noLossBet.connect(opponent).submitOutcome(0, false);
      
      // Simulate some yield
      await celoToken.mint(await aavePoolMock.getAddress(), ethers.parseEther("15")); // 10% yield
      
      // Fast forward time to after expiration
      await time.increase(BET_DURATION + 1);
      
      // Resolve the bet
      const tx = await noLossBet.connect(creator).resolveBet(0);
      const receipt = await tx.wait();
      
      // Check if the BetResolved event was emitted
      const betResolvedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BetResolved'
      );
      expect(betResolvedEvent).to.not.be.undefined;
      
      // Check that bet is resolved
      const bet = await noLossBet.bets(0);
      expect(bet.resolved).to.be.true;
      
      // Check BetM3Token rewards - should be reduced rewards since outcomes didn't match
      const creatorBetM3Balance = await betM3Token.balanceOf(creator.address);
      const opponentBetM3Balance = await betM3Token.balanceOf(opponent.address);
      
      expect(creatorBetM3Balance).to.equal(ethers.parseEther("2")); // 2 BETM3
      expect(opponentBetM3Balance).to.equal(ethers.parseEther("2")); // 2 BETM3
    });
    
    it("should allow resolving an expired bet with no outcomes submitted", async function () {
      // Create and accept a bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      await noLossBet.connect(opponent).acceptBet(0);
      
      // No outcomes submitted
      
      // Simulate some yield
      await celoToken.mint(await aavePoolMock.getAddress(), ethers.parseEther("15")); // 10% yield
      
      // Fast forward time to after expiration
      await time.increase(BET_DURATION + 1);
      
      // Resolve the bet
      const tx = await noLossBet.connect(creator).resolveBet(0);
      const receipt = await tx.wait();
      
      // Check if the BetResolved event was emitted
      const betResolvedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BetResolved'
      );
      expect(betResolvedEvent).to.not.be.undefined;
      
      // Check that bet is resolved
      const bet = await noLossBet.bets(0);
      expect(bet.resolved).to.be.true;
      
      // Check BetM3Token rewards - should be reduced rewards since no outcomes were submitted
      const creatorBetM3Balance = await betM3Token.balanceOf(creator.address);
      const opponentBetM3Balance = await betM3Token.balanceOf(opponent.address);
      
      expect(creatorBetM3Balance).to.equal(ethers.parseEther("2")); // 2 BETM3
      expect(opponentBetM3Balance).to.equal(ethers.parseEther("2")); // 2 BETM3
    });
    
    it("should allow owner to resolve a dispute even if bet is expired", async function () {
      // Create and accept a bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      await noLossBet.connect(opponent).acceptBet(0);
      
      // Submit different outcomes
      await noLossBet.connect(creator).submitOutcome(0, true);
      await noLossBet.connect(opponent).submitOutcome(0, false);
      
      // Simulate some yield
      await celoToken.mint(await aavePoolMock.getAddress(), ethers.parseEther("15")); // 10% yield
      
      // Fast forward time to after expiration
      await time.increase(BET_DURATION + 1);
      
      // Owner resolves the dispute
      const tx = await noLossBet.connect(owner).resolveDispute(0, true); // Creator wins
      const receipt = await tx.wait();
      
      // Check if the DisputeResolved event was emitted
      const disputeResolvedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'DisputeResolved'
      );
      expect(disputeResolvedEvent).to.not.be.undefined;
      
      // Check that bet is resolved
      const bet = await noLossBet.bets(0);
      expect(bet.resolved).to.be.true;
    });
  });
}); 