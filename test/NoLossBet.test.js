const { expect } = require("chai");
const { ethers } = require("hardhat");
// Import Chai matchers for events
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("NoLossBet", function () {
  let NoLossBet, noLossBet, celoToken, betM3Token, aavePoolMock, owner, creator, opponent;

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

  describe("Bet Creation and Acceptance", function() {
    it("should create a bet correctly", async function () {
      // Approve tokens for the bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      
      // Create a bet
      const opponentStake = ethers.parseEther("50");
      const condition = "Team A wins the match";
      const tokenURI = "ipfs://QmXyz";
      
      // Execute the transaction and get the receipt
      const tx = await noLossBet.connect(creator).createBet(opponentStake, condition, tokenURI);
      const receipt = await tx.wait();
      
      // Check if the BetCreated event was emitted with correct parameters
      const betCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BetCreated'
      );
      expect(betCreatedEvent).to.not.be.undefined;
      
      // Check bet details
      const bet = await noLossBet.bets(0);
      expect(bet.creator).to.equal(creator.address);
      expect(bet.opponent).to.equal(ethers.ZeroAddress);
      expect(bet.creatorStake).to.equal(ethers.parseEther("100"));
      expect(bet.opponentStake).to.equal(opponentStake);
      expect(bet.condition).to.equal(condition);
      expect(bet.resolved).to.be.false;
      
      // Check NFT ownership
      expect(await noLossBet.ownerOf(0)).to.equal(creator.address);
      expect(await noLossBet.tokenURI(0)).to.equal(tokenURI);
    });
    
    it("should allow accepting a bet", async function () {
      // Create a bet first
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      // Approve tokens for accepting the bet
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      
      // Accept the bet
      const tx = await noLossBet.connect(opponent).acceptBet(0);
      const receipt = await tx.wait();
      
      // Check if the BetAccepted event was emitted with correct parameters
      const betAcceptedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BetAccepted'
      );
      expect(betAcceptedEvent).to.not.be.undefined;
      
      // Check bet details after acceptance
      const bet = await noLossBet.bets(0);
      expect(bet.opponent).to.equal(opponent.address);
      
      // Check NFT ownership transfer
      expect(await noLossBet.ownerOf(0)).to.equal(opponent.address);
      
      // Check that funds were sent to Aave
      expect(await aavePoolMock.balances(await noLossBet.getAddress())).to.equal(
        ethers.parseEther("150") // 100 + 50
      );
    });
    
    it("should not allow creator to accept their own bet", async function () {
      // Create a bet
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      // Try to accept own bet
      let errorOccurred = false;
      try {
        await noLossBet.connect(creator).acceptBet(0);
      } catch (error) {
        errorOccurred = true;
        expect(error.message).to.include("Creator cannot accept own bet");
      }
      expect(errorOccurred).to.be.true;
    });
  });
  
  describe("Outcome Submission and Resolution", function() {
    beforeEach(async function () {
      // Setup a bet for testing
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      await noLossBet.connect(opponent).acceptBet(0);
    });
    
    it("should allow participants to submit outcomes", async function () {
      // Creator submits outcome
      const creatorTx = await noLossBet.connect(creator).submitOutcome(0, true);
      const creatorReceipt = await creatorTx.wait();
      
      // Check if the OutcomeSubmitted event was emitted with correct parameters
      const creatorEvent = creatorReceipt.logs.find(
        log => log.fragment && log.fragment.name === 'OutcomeSubmitted'
      );
      expect(creatorEvent).to.not.be.undefined;
      
      // Opponent submits outcome
      const opponentTx = await noLossBet.connect(opponent).submitOutcome(0, true);
      const opponentReceipt = await opponentTx.wait();
      
      // Check if the OutcomeSubmitted event was emitted with correct parameters
      const opponentEvent = opponentReceipt.logs.find(
        log => log.fragment && log.fragment.name === 'OutcomeSubmitted'
      );
      expect(opponentEvent).to.not.be.undefined;
      
      // Check bet state
      const bet = await noLossBet.bets(0);
      expect(bet.creatorOutcome).to.be.true;
      expect(bet.opponentOutcome).to.be.true;
    });
    
    it("should not allow non-participants to submit outcomes", async function () {
      let errorOccurred = false;
      try {
        await noLossBet.connect(owner).submitOutcome(0, true);
      } catch (error) {
        errorOccurred = true;
        expect(error.message).to.include("Not a participant");
      }
      expect(errorOccurred).to.be.true;
    });
    
    it("should resolve bet when outcomes match (creator wins)", async function () {
      // Both submit same outcome (true = creator wins)
      await noLossBet.connect(creator).submitOutcome(0, true);
      await noLossBet.connect(opponent).submitOutcome(0, true);
      
      // Simulate some yield by sending extra tokens to the contract
      // In a real scenario, this would come from Aave's yield
      await celoToken.mint(await aavePoolMock.getAddress(), ethers.parseEther("15")); // 10% yield
      
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
      
      // Check token balances after resolution
      // Creator should get their stake back + 80% of yield
      // Opponent should get their stake back + 20% of yield
      const creatorBalance = await celoToken.balanceOf(creator.address);
      const opponentBalance = await celoToken.balanceOf(opponent.address);
      
      // Check BetM3Token rewards
      const creatorBetM3Balance = await betM3Token.balanceOf(creator.address);
      const opponentBetM3Balance = await betM3Token.balanceOf(opponent.address);
      
      expect(creatorBetM3Balance).to.equal(ethers.parseEther("10")); // 10 BETM3
      expect(opponentBetM3Balance).to.equal(ethers.parseEther("5")); // 5 BETM3
    });
    
    it("should resolve bet when outcomes match (opponent wins)", async function () {
      // Both submit same outcome (false = opponent wins)
      await noLossBet.connect(creator).submitOutcome(0, false);
      await noLossBet.connect(opponent).submitOutcome(0, false);
      
      // Simulate some yield
      await celoToken.mint(await aavePoolMock.getAddress(), ethers.parseEther("15")); // 10% yield
      
      // Resolve the bet
      const tx = await noLossBet.connect(opponent).resolveBet(0);
      const receipt = await tx.wait();
      
      // Check if the BetResolved event was emitted
      const betResolvedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'BetResolved'
      );
      expect(betResolvedEvent).to.not.be.undefined;
      
      // Check that bet is resolved
      const bet = await noLossBet.bets(0);
      expect(bet.resolved).to.be.true;
      
      // Check BetM3Token rewards
      const creatorBetM3Balance = await betM3Token.balanceOf(creator.address);
      const opponentBetM3Balance = await betM3Token.balanceOf(opponent.address);
      
      expect(creatorBetM3Balance).to.equal(ethers.parseEther("5")); // 5 BETM3
      expect(opponentBetM3Balance).to.equal(ethers.parseEther("10")); // 10 BETM3
    });
    
    it("should not resolve bet when outcomes don't match", async function () {
      // Submit different outcomes
      await noLossBet.connect(creator).submitOutcome(0, true);
      await noLossBet.connect(opponent).submitOutcome(0, false);
      
      // Try to resolve
      let errorOccurred = false;
      try {
        await noLossBet.connect(creator).resolveBet(0);
      } catch (error) {
        errorOccurred = true;
        expect(error.message).to.include("Outcomes do not match");
      }
      expect(errorOccurred).to.be.true;
    });
  });
  
  describe("Dispute Resolution", function() {
    beforeEach(async function () {
      // Setup a bet with conflicting outcomes
      await celoToken.connect(creator).approve(await noLossBet.getAddress(), ethers.parseEther("100"));
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("50"),
        "Team A wins the match",
        "ipfs://QmXyz"
      );
      
      await celoToken.connect(opponent).approve(await noLossBet.getAddress(), ethers.parseEther("50"));
      await noLossBet.connect(opponent).acceptBet(0);
      
      // Submit conflicting outcomes
      await noLossBet.connect(creator).submitOutcome(0, true);
      await noLossBet.connect(opponent).submitOutcome(0, false);
      
      // Simulate yield
      await celoToken.mint(await aavePoolMock.getAddress(), ethers.parseEther("15")); // 10% yield
    });
    
    it("should allow owner to resolve disputes in favor of creator", async function () {
      const tx = await noLossBet.connect(owner).resolveDispute(0, true);
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
    
    it("should allow owner to resolve disputes in favor of opponent", async function () {
      const tx = await noLossBet.connect(owner).resolveDispute(0, false);
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
    
    it("should not allow non-owners to resolve disputes", async function () {
      let errorOccurred = false;
      try {
        await noLossBet.connect(creator).resolveDispute(0, true);
      } catch (error) {
        errorOccurred = true;
        expect(error.message).to.include("Ownable: caller is not the owner");
      }
      expect(errorOccurred).to.be.true;
    });
    
    it("should not allow resolving disputes when outcomes match", async function () {
      // Change opponent's outcome to match creator's
      await noLossBet.connect(opponent).submitOutcome(0, true);
      
      let errorOccurred = false;
      try {
        await noLossBet.connect(owner).resolveDispute(0, true);
      } catch (error) {
        errorOccurred = true;
        expect(error.message).to.include("No dispute");
      }
      expect(errorOccurred).to.be.true;
    });
  });
}); 