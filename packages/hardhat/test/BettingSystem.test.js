const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Betting System", function () {
  let bettingSystem;
  let mockUSDC;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockUSDC.deploy("Mock USDC", "mUSDC");
    await mockUSDC.waitForDeployment();

    // Deploy BettingSystem
    const BettingSystem = await ethers.getContractFactory("BettingSystem");
    bettingSystem = await BettingSystem.deploy(await mockUSDC.getAddress());
    await bettingSystem.waitForDeployment();

    // Mint some tokens to users for testing
    await mockUSDC.mint(addr1.address, ethers.parseUnits("1000", 6));
    await mockUSDC.mint(addr2.address, ethers.parseUnits("1000", 6));
  });

  describe("Game Creation", function () {
    it("Should create a new betting game", async function () {
      const gameId = 1;
      const minimumBet = ethers.parseUnits("10", 6);
      const gameDuration = 3600; // 1 hour

      await expect(bettingSystem.createGame(gameId, minimumBet, gameDuration))
        .to.emit(bettingSystem, "GameCreated")
        .withArgs(gameId, minimumBet, gameDuration);
    });
  });

  describe("Betting", function () {
    it("Should allow users to place bets", async function () {
      const gameId = 1;
      const betAmount = ethers.parseUnits("50", 6);
      
      // Create game
      await bettingSystem.createGame(
        gameId,
        ethers.parseUnits("10", 6),
        3600
      );

      // Approve spending
      await mockUSDC.connect(addr1).approve(await bettingSystem.getAddress(), betAmount);

      // Place bet
      await expect(bettingSystem.connect(addr1).placeBet(gameId, betAmount))
        .to.emit(bettingSystem, "BetPlaced")
        .withArgs(gameId, addr1.address, betAmount);
    });
  });

  describe("Game Finalization", function () {
    beforeEach(async function () {
      // Setup a game with bets
      const gameId = 1;
      const minimumBet = ethers.parseUnits("10", 6);
      await bettingSystem.createGame(gameId, minimumBet, 3600);

      // Place bets from different users
      const bet1 = ethers.parseUnits("100", 6);
      const bet2 = ethers.parseUnits("50", 6);

      await mockUSDC.connect(addr1).approve(await bettingSystem.getAddress(), bet1);
      await mockUSDC.connect(addr2).approve(await bettingSystem.getAddress(), bet2);

      await bettingSystem.connect(addr1).placeBet(gameId, bet1);
      await bettingSystem.connect(addr2).placeBet(gameId, bet2);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
    });

    it("Should finalize game correctly", async function () {
      const gameId = 1;
      await expect(bettingSystem.finalizeGame(gameId, addr1.address))
        .to.emit(bettingSystem, "GameFinalized");
    });

    it("Should allow winner to claim winnings", async function () {
      const gameId = 1;
      await bettingSystem.finalizeGame(gameId, addr1.address);

      const initialBalance = await mockUSDC.balanceOf(addr1.address);
      await bettingSystem.connect(addr1).claimWinnings(gameId);
      const finalBalance = await mockUSDC.balanceOf(addr1.address);

      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should handle house fees correctly", async function () {
      const gameId = 1;
      await bettingSystem.finalizeGame(gameId, addr1.address);

      const initialOwnerBalance = await mockUSDC.balanceOf(owner.address);
      await bettingSystem.withdrawHouseFees(gameId);
      const finalOwnerBalance = await mockUSDC.balanceOf(owner.address);

      expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
    });
  });

  describe("Error cases", function () {
    it("Should not allow betting after game end", async function () {
      const gameId = 1;
      await bettingSystem.createGame(
        gameId,
        ethers.parseUnits("10", 6),
        3600
      );

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      const betAmount = ethers.parseUnits("50", 6);
      await mockUSDC.connect(addr1).approve(await bettingSystem.getAddress(), betAmount);

      await expect(
        bettingSystem.connect(addr1).placeBet(gameId, betAmount)
      ).to.be.revertedWith("Game has ended");
    });

    it("Should not allow double withdrawal", async function () {
      const gameId = 1;
      const betAmount = ethers.parseUnits("50", 6);

      await bettingSystem.createGame(
        gameId,
        ethers.parseUnits("10", 6),
        3600
      );

      await mockUSDC.connect(addr1).approve(await bettingSystem.getAddress(), betAmount);
      await bettingSystem.connect(addr1).placeBet(gameId, betAmount);

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      await bettingSystem.finalizeGame(gameId, addr1.address);
      await bettingSystem.connect(addr1).claimWinnings(gameId);

      await expect(
        bettingSystem.connect(addr1).claimWinnings(gameId)
      ).to.be.revertedWith("Already withdrawn");
    });
  });
}); 