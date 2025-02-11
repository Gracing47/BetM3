import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther } from "ethers";

describe("BetManager", function () {
  let betManager: any;
  let yieldStrategy: any;
  let mockToken: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addrs: any[];

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock CUSD", "mCUSD");
    await mockToken.deployed();

    // Deploy contracts
    const BetManager = await ethers.getContractFactory("BetManager");
    betManager = await BetManager.deploy(mockToken.address);
    await betManager.deployed();

    const YieldStrategy = await ethers.getContractFactory("YieldStrategy");
    yieldStrategy = await YieldStrategy.deploy(
      owner.address, // Mock router address
      mockToken.address,
      mockToken.address, // Using same token for pair for simplicity
      mockToken.address  // Mock LP token
    );
    await yieldStrategy.deployed();

    // Set up contract relationships
    await betManager.setYieldStrategy(yieldStrategy.address);
    await yieldStrategy.setBetManager(betManager.address);

    // Mint tokens to test addresses
    const amount = parseEther("1000");
    await mockToken.mint(addr1.address, amount);
    await mockToken.mint(addr2.address, amount);
  });

  describe("Bet Creation", function () {
    it("Should create a new bet", async function () {
      const stakeAmount = parseEther("100");
      const duration = 86400; // 1 day
      const condition = "Team A wins";

      const tx = await betManager.createBet(stakeAmount, duration, condition);
      const receipt = await tx.wait();

      // Find BetCreated event
      const event = receipt.events?.find((e: any) => e.event === 'BetCreated');
      expect(event).to.not.be.undefined;
      expect(event?.args?.creator).to.equal(owner.address);
      expect(event?.args?.stakeAmount).to.equal(stakeAmount);
      expect(event?.args?.condition).to.equal(condition);
    });

    it("Should not create bet with zero stake", async function () {
      await expect(
        betManager.createBet(0, 86400, "Test condition")
      ).to.be.revertedWith("Stake amount must be greater than 0");
    });
  });

  describe("Stake Management", function () {
    let betId: string;

    beforeEach(async function () {
      const stakeAmount = parseEther("100");
      const tx = await betManager.createBet(stakeAmount, 86400, "Test condition");
      const receipt = await tx.wait();
      betId = receipt.events?.find((e: any) => e.event === 'BetCreated')?.args?.betId;

      // Approve tokens
      await mockToken.connect(addr1).approve(betManager.address, stakeAmount);
      await mockToken.connect(addr2).approve(betManager.address, stakeAmount);
    });

    it("Should allow participants to add stakes", async function () {
      const tx = await betManager.connect(addr1).addStake(betId);
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === 'StakeAdded');
      expect(event).to.not.be.undefined;
      expect(event?.args?.participant).to.equal(addr1.address);
    });

    it("Should start bet when second participant joins", async function () {
      await betManager.connect(addr1).addStake(betId);
      const tx = await betManager.connect(addr2).addStake(betId);
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === 'BetStarted');
      expect(event).to.not.be.undefined;
    });
  });

  describe("Bet Completion", function () {
    let betId: string;

    beforeEach(async function () {
      // Create and setup bet
      const stakeAmount = parseEther("100");
      const tx = await betManager.createBet(stakeAmount, 86400, "Test condition");
      const receipt = await tx.wait();
      betId = receipt.events?.find((e: any) => e.event === 'BetCreated')?.args?.betId;

      // Add participants
      await mockToken.connect(addr1).approve(betManager.address, stakeAmount);
      await mockToken.connect(addr2).approve(betManager.address, stakeAmount);
      await betManager.connect(addr1).addStake(betId);
      await betManager.connect(addr2).addStake(betId);
    });

    it("Should complete bet and distribute yield", async function () {
      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      const tx = await betManager.completeBet(betId, addr1.address);
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === 'BetCompleted');
      expect(event).to.not.be.undefined;
      expect(event?.args?.winner).to.equal(addr1.address);
    });

    it("Should allow winner to claim principal and yield", async function () {
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      await betManager.completeBet(betId, addr1.address);
      
      const tx = await betManager.connect(addr1).claimPrincipal(betId);
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === 'PrincipalClaimed');
      expect(event).to.not.be.undefined;
      expect(event?.args?.participant).to.equal(addr1.address);
    });
  });
});
