const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockERC20", function () {
  let mockToken;
  let owner;
  let user1;
  let user2;
  
  const tokenName = "Mock Token";
  const tokenSymbol = "MTK";
  const initialSupply = ethers.parseEther("1000000"); // 1 million tokens

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy(tokenName, tokenSymbol, initialSupply);
    await mockToken.waitForDeployment();
  });

  it("Should have correct name, symbol and decimals", async function () {
    expect(await mockToken.name()).to.equal(tokenName);
    expect(await mockToken.symbol()).to.equal(tokenSymbol);
    expect(await mockToken.decimals()).to.equal(18n); // ERC20 default, using BigInt for comparison
  });

  it("Should assign the initial supply to the deployer", async function () {
    const ownerBalance = await mockToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(initialSupply);
  });
  
  it("Should allow token transfers", async function () {
    const transferAmount = ethers.parseEther("100");
    
    // Transfer tokens from owner to user1
    await mockToken.transfer(user1.address, transferAmount);
    
    // Check balances
    expect(await mockToken.balanceOf(user1.address)).to.equal(transferAmount);
    expect(await mockToken.balanceOf(owner.address)).to.equal(initialSupply - transferAmount);
  });
  
  it("Should allow token approvals and transferFrom", async function () {
    const approveAmount = ethers.parseEther("500");
    const transferAmount = ethers.parseEther("200");
    
    // Owner approves user1 to spend tokens
    await mockToken.approve(user1.address, approveAmount);
    
    // Check allowance
    expect(await mockToken.allowance(owner.address, user1.address)).to.equal(approveAmount);
    
    // User1 transfers tokens from owner to user2
    await mockToken.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
    
    // Check balances
    expect(await mockToken.balanceOf(user2.address)).to.equal(transferAmount);
    expect(await mockToken.balanceOf(owner.address)).to.equal(initialSupply - transferAmount);
    
    // Check remaining allowance
    expect(await mockToken.allowance(owner.address, user1.address)).to.equal(approveAmount - transferAmount);
  });
  
  it("Should allow minting new tokens", async function () {
    const mintAmount = ethers.parseEther("5000");
    
    // Mint tokens to user1
    await mockToken.mint(user1.address, mintAmount);
    
    // Check balance
    expect(await mockToken.balanceOf(user1.address)).to.equal(mintAmount);
    
    // Check total supply has increased
    expect(await mockToken.totalSupply()).to.equal(initialSupply + mintAmount);
  });
  
  it("Should allow burning tokens", async function () {
    const burnAmount = ethers.parseEther("1000");
    
    // Burn tokens from owner
    await mockToken.burn(burnAmount);
    
    // Check balance
    expect(await mockToken.balanceOf(owner.address)).to.equal(initialSupply - burnAmount);
    
    // Check total supply has decreased
    expect(await mockToken.totalSupply()).to.equal(initialSupply - burnAmount);
  });
}); 