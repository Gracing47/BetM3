import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", await deployer.getAddress());

    const balance = await ethers.provider.getBalance(await deployer.getAddress());
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    console.log("Starting deployment...");

    // Deploy MockCELO
    console.log("Deploying MockCELO...");
    const MockCELOFactory = await ethers.getContractFactory("MockCELO");
    const mockCELO = await MockCELOFactory.deploy();
    await mockCELO.waitForDeployment();
    const mockCELOAddress = await mockCELO.getAddress();
    console.log("MockCELO deployed to:", mockCELOAddress);

    // Deploy NoLossBet with MockCELO address
    console.log("Deploying NoLossBet...");
    const NoLossBetFactory = await ethers.getContractFactory("NoLossBet");
    const noLossBet = await NoLossBetFactory.deploy(mockCELOAddress);
    await noLossBet.waitForDeployment();
    const noLossBetAddress = await noLossBet.getAddress();
    console.log("NoLossBet deployed to:", noLossBetAddress);

    // Mint initial tokens for testing
    console.log("Minting initial tokens for testing...");
    
    // Mint 10,000 CELO to the deployer
    const mintAmount = ethers.parseEther("10000");
    await mockCELO.mint(await deployer.getAddress(), mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} CELO to deployer`);

    console.log("\nDeployment complete!");
    
    // Create deployment info object
    const deploymentInfo = {
      network: "localhost",
      addresses: {
        noLossBet: noLossBetAddress,
        mockCELO: mockCELOAddress
      }
    };

    // Define paths for deployment files
    const rootDeploymentPath = path.resolve(process.cwd(), '..', '..', 'deployment-localhost.json');
    const hardhatDeploymentPath = path.resolve(process.cwd(), 'deployment-localhost.json');
    const reactAppDeploymentPath = path.resolve(process.cwd(), '..', 'react-app', 'deployment-localhost.json');
    
    // Save deployment info to root directory
    fs.writeFileSync(
      rootDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Deployment info saved to: ${rootDeploymentPath}`);
    
    // Copy to hardhat directory
    fs.writeFileSync(
      hardhatDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Deployment info copied to: ${hardhatDeploymentPath}`);
    
    // Copy to react-app directory
    fs.writeFileSync(
      reactAppDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Deployment info copied to: ${reactAppDeploymentPath}`);
    
    // Log the addresses for reference
    console.log("\nContract Addresses:");
    console.log(JSON.stringify(deploymentInfo.addresses, null, 2));
    
    // Run the script to update ABIs and contract addresses
    console.log("\nUpdating ABIs and contract addresses...");
    try {
      const scriptPath = path.resolve(__dirname, 'update-abis-and-addresses.js');
      execSync(`node ${scriptPath}`, { stdio: 'inherit' });
      console.log("Successfully updated ABIs and contract addresses!");
    } catch (error) {
      console.error("Failed to update ABIs and contract addresses:", error);
    }
    
  } catch (error) {
    console.error("Deployment failed!");
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