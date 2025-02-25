import { ethers } from "hardhat";
import * as fs from 'fs';

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    console.log("Minting CELO with account:", await deployer.getAddress());

    // Load deployment info
    let deploymentInfo;
    try {
      const deploymentData = fs.readFileSync('deployment-localhost.json', 'utf8');
      deploymentInfo = JSON.parse(deploymentData);
    } catch (error) {
      console.error("Could not load deployment info");
      throw error;
    }

    // Get the MockCELO contract address
    const mockCELOAddress = deploymentInfo.addresses.mockCELO;
    if (!mockCELOAddress) {
      throw new Error("MockCELO address not found in deployment info");
    }

    console.log("Using MockCELO at address:", mockCELOAddress);

    // Get the MockCELO contract
    const MockCELO = await ethers.getContractFactory("MockCELO");
    const mockCELO = MockCELO.attach(mockCELOAddress);

    // Mint CELO tokens to the deployer
    const amount = ethers.parseEther("1000");
    console.log(`Minting ${ethers.formatEther(amount)} CELO tokens to ${await deployer.getAddress()}`);
    const tx = await mockCELO.mint(await deployer.getAddress(), amount);
    await tx.wait();
    console.log("Minting successful!");

    // Check the balance
    const balance = await mockCELO.balanceOf(await deployer.getAddress());
    console.log(`New balance: ${ethers.formatEther(balance)} CELO`);

  } catch (error) {
    console.error("Minting failed!");
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