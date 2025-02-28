// Test script for MockCELO contract interaction from the frontend
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Import the ABI directly
const { MockCELOABI } = require('./abis/generated/MockCELOABI');

async function main() {
  try {
    console.log("=== Starting Frontend MockCELO Test ===");
    
    // Connect to local Ethereum node
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    console.log("Connected to provider");
    
    // Use the first account as the signer
    const ownerWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    console.log("Using wallet address:", await ownerWallet.getAddress());
    
    // Load deployment info
    let deploymentInfo;
    try {
      console.log("Reading deployment-localhost.json...");
      const deploymentData = fs.readFileSync('./deployment-localhost.json', 'utf8');
      deploymentInfo = JSON.parse(deploymentData);
      console.log("Deployment info loaded successfully");
    } catch (error) {
      console.error("Could not load deployment info:", error);
      throw error;
    }

    // Get the MockCELO contract address
    const mockCELOAddress = deploymentInfo.addresses.mockCELO;
    if (!mockCELOAddress) {
      throw new Error("MockCELO address not found in deployment info");
    }

    console.log("Using MockCELO at address:", mockCELOAddress);

    // Create contract instance
    const mockCELO = new ethers.Contract(
      mockCELOAddress,
      MockCELOABI,
      ownerWallet
    );
    console.log("Created MockCELO contract instance");

    // Test address
    const testAddress = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199";
    
    // Check balance
    console.log(`Checking balance of test address ${testAddress}...`);
    const balance = await mockCELO.balanceOf(testAddress);
    console.log(`Test address balance: ${ethers.formatEther(balance)} CELO`);

    // Mint tokens
    const amount = ethers.parseEther("50");
    console.log(`Minting ${ethers.formatEther(amount)} CELO tokens to ${testAddress}...`);
    const tx = await mockCELO.mint(testAddress, amount);
    console.log("Mint transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Minting successful! Transaction hash:", tx.hash);

    // Check updated balance
    const newBalance = await mockCELO.balanceOf(testAddress);
    console.log(`New test address balance: ${ethers.formatEther(newBalance)} CELO`);
    
    console.log("=== Frontend MockCELO Test Completed Successfully ===");
  } catch (error) {
    console.error("=== Test Failed! ===");
    console.error("Error:", error);
  }
}

main(); 