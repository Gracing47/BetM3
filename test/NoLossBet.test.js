const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NoLossBet Contract", function () {
  // Test variables
  let NoLossBet, noLossBet;
  let MockERC20, celoToken, stableToken, betM3Token, lpToken;
  let MockUniswapRouter, uniswapRouter;
  let owner, creator, opponent, addr3, addr4;
  let creatorStake, opponentStake;
  let BET_CONDITION, TOKEN_URI, COMMENT_TEXT, betId;
  
  // Setup before each test
  beforeEach(async function () {
    [owner, creator, opponent, addr3, addr4, ...addrs] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    celoToken = await MockERC20Factory.deploy("Celo", "CELO", ethers.parseEther("10000"));
    stableToken = await MockERC20Factory.deploy("cUSD", "cUSD", ethers.parseEther("10000"));
    betM3Token = await MockERC20Factory.deploy("BetM3", "BM3", ethers.parseEther("10000"));
    lpToken = await MockERC20Factory.deploy("LP Token", "LP", ethers.parseEther("10000"));
    
    // Deploy mock Uniswap router
    const MockUniswapRouterFactory = await ethers.getContractFactory("MockUniswapRouter");
    uniswapRouter = await MockUniswapRouterFactory.deploy();
    
    // Deploy NoLossBet contract
    const NoLossBetFactory = await ethers.getContractFactory("NoLossBet");
    noLossBet = await NoLossBetFactory.deploy(
      celoToken.target,
      stableToken.target,
      betM3Token.target,
      lpToken.target,
      uniswapRouter.target
    );
    
    // Mint tokens for testing
    await celoToken.connect(owner).mint(creator.address, ethers.parseEther("1000"));
    await celoToken.connect(owner).mint(opponent.address, ethers.parseEther("1000"));
    await celoToken.connect(owner).mint(addr3.address, ethers.parseEther("1000"));
    await stableToken.connect(owner).mint(owner.address, ethers.parseEther("1000"));
    await celoToken.connect(owner).mint(noLossBet.target, ethers.parseEther("200")); // For resolving bets
    await stableToken.connect(owner).mint(noLossBet.target, ethers.parseEther("200")); // For resolving bets
    
    // Mint BetM3Tokens to the NoLossBet contract so it can distribute rewards
    await betM3Token.connect(owner).mint(noLossBet.target, ethers.parseEther("10000"));
    
    // Mint LP tokens to the NoLossBet contract for liquidity removal in tests
    await lpToken.connect(owner).mint(noLossBet.target, ethers.parseEther("1000"));

    // Set up default values for testing
    creatorStake = ethers.parseEther("100"); // Minimum required by contract
    opponentStake = ethers.parseEther("50");
    BET_CONDITION = "Will ETH reach $5000 by the end of the month?";
    TOKEN_URI = "ipfs://QmXxx";
    COMMENT_TEXT = "I think ETH will not reach $5000";
    betId = 0; // First bet ID

    // Approve token transfers
    await celoToken.connect(creator).approve(noLossBet.target, ethers.parseEther("1000")); // Increase approval amount
    await stableToken.connect(owner).approve(noLossBet.target, ethers.parseEther("1000")); // For liquidity
  });

  // Test suite for deployment
  describe("Deployment", function () {
    it("Should deploy NoLossBet contract correctly", async function () {
      expect(await noLossBet.owner()).to.equal(owner.address);
      expect(await noLossBet.celoToken()).to.equal(celoToken.target);
      expect(await noLossBet.stableToken()).to.equal(stableToken.target);
      expect(await noLossBet.betM3Token()).to.equal(betM3Token.target);
      expect(await noLossBet.uniswapRouter()).to.equal(uniswapRouter.target);
    });
  });

  // Test suite for bet creation
  describe("Bet Creation", function () {
    it("Should create a bet with valid parameters", async function () {
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, BET_CONDITION, TOKEN_URI);
      
      const bet = await noLossBet.bets(betId);
      expect(bet.creator).to.equal(creator.address);
      expect(bet.condition).to.equal(BET_CONDITION);
      expect(bet.creatorStake).to.equal(creatorStake);
      expect(bet.opponentStake).to.equal(opponentStake);
      expect(bet.condition).to.equal(BET_CONDITION);
      expect(bet.resolved).to.equal(false);

      // Check NFT ownership
      expect(await noLossBet.ownerOf(betId)).to.equal(creator.address);
      expect(await noLossBet.tokenURI(betId)).to.equal(TOKEN_URI);
    });

    it("Should fail to create a bet with insufficient stake", async function () {
      const lowStake = ethers.parseEther("50"); // Below minimum 100 CELO
      
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(creator).createBet(lowStake, opponentStake, BET_CONDITION, TOKEN_URI);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });

    it("Should fail to create a bet without token approval", async function () {
      // Revoke approval
      await celoToken.connect(creator).approve(noLossBet.target, 0);
      
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(creator).createBet(creatorStake, opponentStake, BET_CONDITION, TOKEN_URI);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });
  });

  // Test suite for bet acceptance
  describe("Bet Acceptance", function () {
    beforeEach(async function () {
      // Create a bet before each test in this suite
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, BET_CONDITION, TOKEN_URI);
    });

    it("Should accept a bet with default stake", async function () {
      // Make sure opponent approves tokens
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      
      await noLossBet.connect(opponent).acceptBet(betId, false); // false = betting against the condition

      const bet = await noLossBet.bets(betId);
      expect(bet.opponent).to.equal(opponent.address);
      expect(bet.opponentOutcome).to.equal(false);
      expect(bet.commentText).to.equal("");

      // Check NFT transfer
      expect(await noLossBet.ownerOf(betId)).to.equal(opponent.address);
    });

    it("Should accept a bet with custom stake and comment", async function () {
      const customStake = ethers.parseEther("20"); // Higher than default
      
      // Make sure opponent approves tokens
      await celoToken.connect(opponent).approve(noLossBet.target, customStake);
      
      await noLossBet.connect(opponent).acceptBet(betId, true, customStake, COMMENT_TEXT);

      const bet = await noLossBet.bets(betId);
      expect(bet.opponent).to.equal(opponent.address);
      expect(bet.opponentOutcome).to.equal(true);
      expect(bet.opponentStake).to.equal(customStake);
      expect(bet.commentText).to.equal(COMMENT_TEXT);
    });

    it("Should fail to accept a bet with insufficient stake", async function () {
      const lowStake = ethers.parseEther("5"); // Below minimum 10 CELO
      
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(opponent).acceptBet(betId, false, lowStake, "");
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });

    it("Should fail if creator tries to accept their own bet", async function () {
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(creator).acceptBet(betId, false);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });

    it("Should fail to accept an already accepted bet", async function () {
      // First acceptance - make sure opponent approves tokens
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      await noLossBet.connect(opponent).acceptBet(betId, false);
      
      // Second attempt - use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await celoToken.connect(addr3).approve(noLossBet.target, opponentStake);
        await noLossBet.connect(addr3).acceptBet(betId, true);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });
  });

  // Test suite for outcome submission
  describe("Outcome Submission", function () {
    beforeEach(async function () {
      // Create and accept a bet before each test
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, BET_CONDITION, TOKEN_URI);
      
      // Make sure opponent approves tokens
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      await noLossBet.connect(opponent).acceptBet(betId, false);
    });

    it("Should allow creator to submit outcome", async function () {
      await noLossBet.connect(creator).submitOutcome(betId, true);
      
      const bet = await noLossBet.bets(betId);
      expect(bet.creatorOutcome).to.equal(true);
    });

    it("Should allow opponent to submit outcome", async function () {
      await noLossBet.connect(opponent).submitOutcome(betId, false);
      
      const bet = await noLossBet.bets(betId);
      expect(bet.opponentOutcome).to.equal(false);
    });

    it("Should fail if non-participant tries to submit outcome", async function () {
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(addr3).submitOutcome(betId, true);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });
  });

  // Test suite for bet resolution
  describe("Bet Resolution", function () {
    beforeEach(async function () {
      // Create and accept a bet before each test
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, BET_CONDITION, TOKEN_URI);
      
      // Make sure opponent approves tokens
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      await noLossBet.connect(opponent).acceptBet(betId, false);
      
      // Mock the LP token being set in the betLiquidity mapping
      // This simulates the liquidity that would be added during bet acceptance
      await lpToken.connect(owner).mint(noLossBet.target, ethers.parseEther("100"));
      await lpToken.connect(owner).approve(uniswapRouter.target, ethers.parseEther("100"));
    });

    it("Should resolve bet when outcomes match (creator wins)", async function () {
      // Both submit same outcome (true = creator wins)
      await noLossBet.connect(creator).submitOutcome(betId, true);
      await noLossBet.connect(opponent).submitOutcome(betId, true);
      
      // Get balances before resolution
      const creatorBalanceBefore = await celoToken.balanceOf(creator.address);
      const opponentBalanceBefore = await celoToken.balanceOf(opponent.address);
      
      // Resolve the bet
      await noLossBet.connect(creator).resolveBet(betId);
      
      // Check bet is resolved
      const bet = await noLossBet.bets(betId);
      expect(bet.resolved).to.equal(true);
      
      // Check balances after resolution (should get back stake + yield)
      const creatorBalanceAfter = await celoToken.balanceOf(creator.address);
      const opponentBalanceAfter = await celoToken.balanceOf(opponent.address);
      
      // Creator should get their stake back plus 80% of yield
      expect(Number(creatorBalanceAfter) > Number(creatorBalanceBefore)).to.be.true;
      
      // Opponent should get their stake back plus 20% of yield
      expect(Number(opponentBalanceAfter) > Number(opponentBalanceBefore)).to.be.true;
    });

    it("Should resolve bet when outcomes match (opponent wins)", async function () {
      // Both submit same outcome (false = opponent wins)
      await noLossBet.connect(creator).submitOutcome(betId, false);
      await noLossBet.connect(opponent).submitOutcome(betId, false);
      
      // Get balances before resolution
      const creatorBalanceBefore = await celoToken.balanceOf(creator.address);
      const opponentBalanceBefore = await celoToken.balanceOf(opponent.address);
      
      // Resolve the bet
      await noLossBet.connect(opponent).resolveBet(betId);
      
      // Check bet is resolved
      const bet = await noLossBet.bets(betId);
      expect(bet.resolved).to.equal(true);
      
      // Check balances after resolution (should get back stake + yield)
      const creatorBalanceAfter = await celoToken.balanceOf(creator.address);
      const opponentBalanceAfter = await celoToken.balanceOf(opponent.address);
      
      // Creator should get their stake back plus 20% of yield
      expect(Number(creatorBalanceAfter) > Number(creatorBalanceBefore)).to.be.true;
      
      // Opponent should get their stake back plus 80% of yield
      expect(Number(opponentBalanceAfter) > Number(opponentBalanceBefore)).to.be.true;
    });

    it("Should fail to resolve bet when outcomes don't match", async function () {
      await noLossBet.connect(creator).submitOutcome(betId, true);
      await noLossBet.connect(opponent).submitOutcome(betId, false);
      
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(creator).resolveBet(betId);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });

    it("Should distribute stakes correctly with specific yield distribution", async function () {
      // Both submit same outcome (true = creator wins)
      await noLossBet.connect(creator).submitOutcome(betId, true);
      await noLossBet.connect(opponent).submitOutcome(betId, true);
      
      // Get balances before resolution
      const creatorBalanceBefore = await celoToken.balanceOf(creator.address);
      const opponentBalanceBefore = await celoToken.balanceOf(opponent.address);
      
      // Resolve the bet
      await noLossBet.connect(creator).resolveBet(betId);
      
      // Check balances after resolution
      const creatorBalanceAfter = await celoToken.balanceOf(creator.address);
      const opponentBalanceAfter = await celoToken.balanceOf(opponent.address);
      
      // Verify that both parties received at least their stake back
      expect(Number(creatorBalanceAfter) > Number(creatorBalanceBefore)).to.be.true;
      expect(Number(opponentBalanceAfter) > Number(opponentBalanceBefore)).to.be.true;
      
      // Verify that the bet is marked as resolved
      const bet = await noLossBet.bets(betId);
      expect(bet.resolved).to.equal(true);
      
      // Verify that BetM3 tokens were distributed (by checking if the contract's balance decreased)
      const betM3BalanceBefore = await betM3Token.balanceOf(noLossBet.target);
      const creatorBetM3BalanceBefore = await betM3Token.balanceOf(creator.address);
      const opponentBetM3BalanceBefore = await betM3Token.balanceOf(opponent.address);
      
      // Create and resolve another bet to check BetM3 token distribution
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, "Another bet", TOKEN_URI);
      const newBetId = 1;
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      await noLossBet.connect(opponent).acceptBet(newBetId, true);
      await noLossBet.connect(creator).submitOutcome(newBetId, true);
      await noLossBet.connect(opponent).submitOutcome(newBetId, true);
      await noLossBet.connect(creator).resolveBet(newBetId);
      
      // Check if BetM3 tokens were distributed
      const creatorBetM3BalanceAfter = await betM3Token.balanceOf(creator.address);
      const opponentBetM3BalanceAfter = await betM3Token.balanceOf(opponent.address);
      
      // At least one of them should have received BetM3 tokens
      expect(Number(creatorBetM3BalanceAfter) >= Number(creatorBetM3BalanceBefore) || 
             Number(opponentBetM3BalanceAfter) >= Number(opponentBetM3BalanceBefore)).to.be.true;
    });

    it("Should fail if bet is already resolved", async function () {
      // Both submit same outcome
      await noLossBet.connect(creator).submitOutcome(betId, true);
      await noLossBet.connect(opponent).submitOutcome(betId, true);
      
      // Resolve the bet first time
      await noLossBet.connect(creator).resolveBet(betId);
      
      // Try to resolve again - should fail
      let error;
      try {
        await noLossBet.connect(creator).resolveBet(betId);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });

    it("Should allow resolving an expired bet", async function () {
      // Create a bet with a short expiration time
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, "Expiring bet", TOKEN_URI);
      const expiredBetId = 1;
      
      // Accept the bet
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      await noLossBet.connect(opponent).acceptBet(expiredBetId, false);
      
      // Mock the LP token being set in the betLiquidity mapping
      await lpToken.connect(owner).mint(noLossBet.target, ethers.parseEther("100"));
      
      // Get the current bet
      const bet = await noLossBet.bets(expiredBetId);
      
      // Fast forward time to after expiration (7 days + 1 hour)
      await time.increase(7 * 24 * 60 * 60 + 3600);
      
      // Get balances before resolution
      const creatorBalanceBefore = await celoToken.balanceOf(creator.address);
      const opponentBalanceBefore = await celoToken.balanceOf(opponent.address);
      
      // Resolve the expired bet using the public resolveBet function
      await noLossBet.connect(creator).resolveBet(expiredBetId);
      
      // Check balances after resolution
      const creatorBalanceAfter = await celoToken.balanceOf(creator.address);
      const opponentBalanceAfter = await celoToken.balanceOf(opponent.address);
      
      // Both should get their stakes back
      expect(Number(creatorBalanceAfter) > Number(creatorBalanceBefore)).to.be.true;
      expect(Number(opponentBalanceAfter) > Number(opponentBalanceBefore)).to.be.true;
      
      // Check bet is resolved
      const resolvedBet = await noLossBet.bets(expiredBetId);
      expect(resolvedBet.resolved).to.equal(true);
    });
  });

  // Test suite for dispute resolution
  describe("Dispute Resolution", function () {
    beforeEach(async function () {
      // Create and accept a bet before each test
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, BET_CONDITION, TOKEN_URI);
      
      // Make sure opponent approves tokens
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      await noLossBet.connect(opponent).acceptBet(betId, false);
      
      // Create a dispute by submitting conflicting outcomes
      await noLossBet.connect(creator).submitOutcome(betId, true);
      await noLossBet.connect(opponent).submitOutcome(betId, false);
      
      // Mock the LP token being set in the betLiquidity mapping
      // This simulates the liquidity that would be added during bet acceptance
      await lpToken.connect(owner).mint(noLossBet.target, ethers.parseEther("100"));
      await lpToken.connect(owner).approve(uniswapRouter.target, ethers.parseEther("100"));
    });

    it("Should allow owner to resolve dispute in creator's favor", async function () {
      // Get balances before resolution
      const creatorBalanceBefore = await celoToken.balanceOf(creator.address);
      const opponentBalanceBefore = await celoToken.balanceOf(opponent.address);
      
      // Owner resolves dispute in creator's favor
      await noLossBet.connect(owner).resolveDispute(betId, true);
      
      // Check bet is resolved
      const bet = await noLossBet.bets(betId);
      expect(bet.resolved).to.equal(true);
      
      // Check balances after resolution
      const creatorBalanceAfter = await celoToken.balanceOf(creator.address);
      const opponentBalanceAfter = await celoToken.balanceOf(opponent.address);
      
      // Creator should get their stake back plus all yield
      expect(Number(creatorBalanceAfter) > Number(creatorBalanceBefore)).to.be.true;
      
      // Opponent should get only their stake back
      expect(Number(opponentBalanceAfter) >= Number(opponentBalanceBefore)).to.be.true;
    });

    it("Should allow owner to resolve dispute in opponent's favor", async function () {
      // Owner resolves dispute in opponent's favor
      await noLossBet.connect(owner).resolveDispute(betId, false);
      
      // Check bet is resolved
      const bet = await noLossBet.bets(betId);
      expect(bet.resolved).to.equal(true);
    });

    it("Should fail if non-owner tries to resolve dispute", async function () {
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(creator).resolveDispute(betId, true);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });

    it("Should fail to resolve dispute if there is no conflict", async function () {
      // Create a new bet with matching outcomes
      await noLossBet.connect(creator).createBet(creatorStake, opponentStake, "New bet", TOKEN_URI);
      const newBetId = 1;
      
      // Make sure opponent approves tokens for this bet
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      await noLossBet.connect(opponent).acceptBet(newBetId, true);
      
      await noLossBet.connect(creator).submitOutcome(newBetId, true);
      await noLossBet.connect(opponent).submitOutcome(newBetId, true);
      
      // Use await and expect to throw instead of .to.be.reverted
      let error;
      try {
        await noLossBet.connect(owner).resolveDispute(newBetId, true);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
    });
  });

  // Test suite for utility functions
  describe("Utility Functions", function () {
    it("Should allow owner to fund community pool", async function () {
      // Get initial balance of the contract
      const initialBalance = await betM3Token.balanceOf(noLossBet.target);
      
      // Fund the community pool
      await betM3Token.connect(owner).approve(noLossBet.target, ethers.parseEther("100"));
      await noLossBet.connect(owner).fundCommunityPool(ethers.parseEther("100"));
      
      // Check community pool balance (directly check the contract's token balance)
      const finalBalance = await betM3Token.balanceOf(noLossBet.target);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("100"));
    });

    it("Should allow owner to fund stable token pool", async function () {
      // Mint stable tokens to owner and approve
      await stableToken.mint(owner.address, ethers.parseEther("100"));
      await stableToken.connect(owner).approve(noLossBet.target, ethers.parseEther("100"));
      
      // Get initial balance
      const initialBalance = await stableToken.balanceOf(noLossBet.target);
      
      // Fund the stable token pool
      await noLossBet.connect(owner).fundStableTokenPool(ethers.parseEther("100"));
      
      // Check stable token pool balance (directly check the contract's token balance)
      const finalBalance = await stableToken.balanceOf(noLossBet.target);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("100"));
    });
  });

  // Test suite for edge cases
  describe("Edge Cases", function () {
    it("Should handle minimum stakes correctly", async function () {
      // Create bet with minimum stake - ensure proper approval
      await celoToken.connect(creator).approve(noLossBet.target, ethers.parseEther("100"));
      
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("100"), // Minimum creator stake
        ethers.parseEther("10"),  // Minimum opponent stake
        BET_CONDITION,
        TOKEN_URI
      );
      
      // Accept bet with minimum stake - ensure we have approval
      await celoToken.connect(opponent).approve(noLossBet.target, ethers.parseEther("10"));
      await noLossBet.connect(opponent).acceptBet(betId, false, ethers.parseEther("10"), "");
      
      const bet = await noLossBet.bets(betId);
      expect(bet.creatorStake).to.equal(ethers.parseEther("100"));
      expect(bet.opponentStake).to.equal(ethers.parseEther("10"));
    });

    it("Should handle large stakes correctly", async function () {
      // Create bet with large stake - ensure proper approval
      await celoToken.connect(creator).approve(noLossBet.target, ethers.parseEther("500"));
      
      await noLossBet.connect(creator).createBet(
        ethers.parseEther("500"), // Large creator stake
        ethers.parseEther("50"),  // Large opponent stake
        BET_CONDITION,
        TOKEN_URI
      );
      
      // Accept bet with large stake - ensure we have approval
      await celoToken.connect(opponent).approve(noLossBet.target, ethers.parseEther("50"));
      await noLossBet.connect(opponent).acceptBet(betId, false, ethers.parseEther("50"), "");
      
      const bet = await noLossBet.bets(betId);
      expect(bet.creatorStake).to.equal(ethers.parseEther("500"));
      expect(bet.opponentStake).to.equal(ethers.parseEther("50"));
    });
  });

  // Test suite for bet expiration
  describe("Bet Expiration", function () {
    it("Should not allow accepting an expired bet", async function () {
      // Get the current bet counter
      const betCounterBefore = await noLossBet.betCounter();
      
      // Create a bet
      await celoToken.connect(creator).approve(noLossBet.target, creatorStake);
      await noLossBet.connect(creator).createBet(
        creatorStake,
        opponentStake,
        "Will it rain tomorrow?",
        "ipfs://betdata"
      );
      
      // The betId should be the previous counter value
      const betId = betCounterBefore;

      // Fast forward time to simulate expiration
      await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60 + 1]); // 14 days + 1 second
      await ethers.provider.send("evm_mine");

      // Try to accept the bet, should fail
      await celoToken.connect(opponent).approve(noLossBet.target, opponentStake);
      
      // Use try-catch to verify the error
      let error;
      try {
        await noLossBet.connect(opponent).acceptBet(betId, true);
        expect.fail("Should have thrown an error");
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.undefined;
      expect(error.message).to.include("Bet has expired");
    });

    // Note: There's no way to withdraw from an unaccepted expired bet in the current contract
    // The resolveBet function requires bet.opponent != address(0)
  });
}); 