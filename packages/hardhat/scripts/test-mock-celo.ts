import { ethers } from "hardhat";
import * as fs from 'fs';

async function main() {
  try {
    console.log("=== Starting MockCELO Test ===");
    
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    console.log("Testing MockCELO with account:", await deployer.getAddress());
    
    // Load deployment info
    let deploymentInfo;
    try {
      console.log("Reading deployment-localhost.json...");
      const deploymentData = fs.readFileSync('deployment-localhost.json', 'utf8');
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

    // Get the MockCELO contract
    console.log("Getting MockCELO contract factory...");
    const MockCELO = await ethers.getContractFactory("MockCELO");
    console.log("Attaching to MockCELO contract...");
    const mockCELO = MockCELO.attach(mockCELOAddress);
    console.log("Successfully attached to MockCELO contract");

    // Check the balance of the deployer
    console.log("Checking deployer balance...");
    const balance = await mockCELO.balanceOf(await deployer.getAddress());
    console.log(`Current balance: ${ethers.formatEther(balance)} CELO`);

    // Test the balanceOf function with a random address
    const testAddress = "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199"; // This is the address from the error message
    console.log(`Checking balance of test address ${testAddress}...`);
    const testBalance = await mockCELO.balanceOf(testAddress);
    console.log(`Test address ${testAddress} balance: ${ethers.formatEther(testBalance)} CELO`);

    // Mint some tokens to the test address
    const amount = ethers.parseEther("200");
    console.log(`Minting ${ethers.formatEther(amount)} CELO tokens to ${testAddress}...`);
    const tx = await mockCELO.mint(testAddress, amount);
    console.log("Mint transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Minting successful! Transaction hash:", tx.hash);
    console.log("Transaction receipt:", receipt);

    // Check the balance again
    console.log("Checking updated balance...");
    const newTestBalance = await mockCELO.balanceOf(testAddress);
    console.log(`New test address balance: ${ethers.formatEther(newTestBalance)} CELO`);
    
    console.log("=== MockCELO Test Completed Successfully ===");
  } catch (error) {
    console.error("=== Test Failed! ===");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 