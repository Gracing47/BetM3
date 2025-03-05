import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
const { ethers } = hre;

describe("BettingManagerFactory Contract", function () {
  let cUSDToken: any;
  let bettingManagerFactory: any;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy cUSDToken
    const CUSDTokenFactory = await ethers.getContractFactory("cUSDToken");
    cUSDToken = await CUSDTokenFactory.deploy();

    // Deploy BettingManagerFactory
    const BettingManagerFactoryFactory = await ethers.getContractFactory("BettingManagerFactory");
    bettingManagerFactory = await BettingManagerFactoryFactory.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      // @ts-ignore
      expect(await bettingManagerFactory.owner()).to.equal(owner.address);
    });

    it("Should initially have zero contracts", async function () {
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContractsCount()).to.equal(0);
    });
  });

  describe("Contract Creation", function () {
    it("Should create a new betting contract", async function () {
      // @ts-ignore
      const createTx = await bettingManagerFactory.createBettingContract(await cUSDToken.getAddress());
      const receipt = await createTx.wait();

      // Verify contract count increased
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContractsCount()).to.equal(1);

      // Extract the betting contract address from event logs
      const event = receipt?.logs[0];
      // @ts-ignore
      const bettingContractAddress = bettingManagerFactory.interface.parseLog({
        topics: event?.topics as string[],
        data: event?.data as string
      })?.args[0];

      // Verify the contract was stored in the array
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContract(0)).to.equal(bettingContractAddress);

      // Verify the creator in the event
      // @ts-ignore
      expect(bettingManagerFactory.interface.parseLog({
        topics: event?.topics as string[],
        data: event?.data as string
      })?.args[1]).to.equal(owner.address);
    });

    it("Should transfer ownership to the creator", async function () {
      // Owner creates a betting contract
      // @ts-ignore
      const createTx = await bettingManagerFactory.createBettingContract(await cUSDToken.getAddress());
      const receipt = await createTx.wait();

      // Extract the betting contract address
      const event = receipt?.logs[0];
      // @ts-ignore
      const bettingContractAddress = bettingManagerFactory.interface.parseLog({
        topics: event?.topics as string[],
        data: event?.data as string
      })?.args[0];

      // Get the contract instance
      const NoLossBetMulti = await ethers.getContractFactory("NoLossBetMulti");
      const bettingContract = NoLossBetMulti.attach(bettingContractAddress);

      // Verify the contract owner is the creator
      // @ts-ignore
      expect(await bettingContract.owner()).to.equal(owner.address);
    });

    it("Should allow different users to create betting contracts", async function () {
      // User 1 creates a betting contract
      // @ts-ignore
      const createTx1 = await bettingManagerFactory.connect(user1).createBettingContract(await cUSDToken.getAddress());
      const receipt1 = await createTx1.wait();
      const event1 = receipt1?.logs[0];
      // @ts-ignore
      const bettingContract1Address = bettingManagerFactory.interface.parseLog({
        topics: event1?.topics as string[],
        data: event1?.data as string
      })?.args[0];

      // User 2 creates a betting contract
      // @ts-ignore
      const createTx2 = await bettingManagerFactory.connect(user2).createBettingContract(await cUSDToken.getAddress());
      const receipt2 = await createTx2.wait();
      const event2 = receipt2?.logs[0];
      // @ts-ignore
      const bettingContract2Address = bettingManagerFactory.interface.parseLog({
        topics: event2?.topics as string[],
        data: event2?.data as string
      })?.args[0];

      // Verify contract count is 2
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContractsCount()).to.equal(2);

      // Verify both contracts are stored
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContract(0)).to.equal(bettingContract1Address);
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContract(1)).to.equal(bettingContract2Address);

      // Get the contract instances
      const NoLossBetMulti = await ethers.getContractFactory("NoLossBetMulti");
      const bettingContract1 = NoLossBetMulti.attach(bettingContract1Address);
      const bettingContract2 = NoLossBetMulti.attach(bettingContract2Address);

      // Verify each contract's owner is the respective creator
      // @ts-ignore
      expect(await bettingContract1.owner()).to.equal(user1.address);
      // @ts-ignore
      expect(await bettingContract2.owner()).to.equal(user2.address);
    });
  });

  describe("Contract Retrieval", function () {
    it("Should allow getting contract by index", async function () {
      // Create multiple contracts
      for (let i = 0; i < 3; i++) {
        // @ts-ignore
        await bettingManagerFactory.createBettingContract(await cUSDToken.getAddress());
      }

      // Verify count
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContractsCount()).to.equal(3);

      // Retrieve each contract
      // @ts-ignore
      const contract0 = await bettingManagerFactory.getBettingContract(0);
      // @ts-ignore
      const contract1 = await bettingManagerFactory.getBettingContract(1);
      // @ts-ignore
      const contract2 = await bettingManagerFactory.getBettingContract(2);

      // Each address should be unique
      expect(contract0).to.not.equal(contract1);
      expect(contract1).to.not.equal(contract2);
      expect(contract0).to.not.equal(contract2);
    });

    it("Should revert when index is out of bounds", async function () {
      // Create one contract
      // @ts-ignore
      await bettingManagerFactory.createBettingContract(await cUSDToken.getAddress());

      // Verify count
      // @ts-ignore
      expect(await bettingManagerFactory.getBettingContractsCount()).to.equal(1);

      // Valid index should work
      // @ts-ignore
      await bettingManagerFactory.getBettingContract(0);

      // Invalid index should revert
      await expect(
        // @ts-ignore
        bettingManagerFactory.getBettingContract(1)
      ).to.be.rejectedWith("Index out of bounds");
    });
  });
}); 