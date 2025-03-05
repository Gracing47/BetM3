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

    // Deploy cUSDToken
    console.log("Deploying cUSDToken...");
    const CUSDTokenFactory = await ethers.getContractFactory("cUSDToken");
    const cUSDToken = await CUSDTokenFactory.deploy();
    await cUSDToken.waitForDeployment();
    const cUSDTokenAddress = await cUSDToken.getAddress();
    console.log("cUSDToken deployed to:", cUSDTokenAddress);

    // Deploy BettingManagerFactory
    console.log("Deploying BettingManagerFactory...");
    const BettingManagerFactoryFactory = await ethers.getContractFactory("BettingManagerFactory");
    const bettingManagerFactory = await BettingManagerFactoryFactory.deploy();
    await bettingManagerFactory.waitForDeployment();
    const bettingManagerFactoryAddress = await bettingManagerFactory.getAddress();
    console.log("BettingManagerFactory deployed to:", bettingManagerFactoryAddress);

    // Statt den Factory-Ansatz zu verwenden, deployen wir direkt einen NoLossBetMulti-Vertrag
    // Das vermeidet Probleme mit der Ereignisextraktion und stellt sicher, dass wir eine gültige Adresse haben
    console.log("Deploying NoLossBetMulti directly...");
    const NoLossBetMultiFactory = await ethers.getContractFactory("NoLossBetMulti");
    const bettingContract = await NoLossBetMultiFactory.deploy(cUSDTokenAddress);
    await bettingContract.waitForDeployment();
    const bettingContractAddress = await bettingContract.getAddress();
    console.log("NoLossBetMulti deployed to:", bettingContractAddress);

    // Mint initial tokens for testing
    console.log("Minting initial tokens for testing...");
    
    // Mint 10,000 cUSD to the deployer
    const mintAmount = ethers.parseEther("10000");
    await cUSDToken.mint(await deployer.getAddress(), mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} cUSD to deployer`);

    // Wichtig: Überweise zusätzliche Token an den Betting-Vertrag für die Yield-Simulation
    const yieldAmount = ethers.parseEther("1000"); // 1000 Token für Yield
    await cUSDToken.mint(bettingContractAddress, yieldAmount);
    console.log(`Minted ${ethers.formatEther(yieldAmount)} cUSD to betting contract for yield`);

    // Set a custom yield rate (optional)
    await bettingContract.setYieldRate(10); // 10% yield instead of default 5%
    console.log("Set custom yield rate: 10%");

    console.log("\nDeployment complete!");
    
    // Create deployment info object
    const deploymentInfo = {
      network: "localhost",
      addresses: {
        cUSDToken: cUSDTokenAddress,
        bettingManagerFactory: bettingManagerFactoryAddress,
        bettingContract: bettingContractAddress
      }
    };

    // Define paths for deployment files
    const rootDeploymentPath = path.resolve(process.cwd(), '..', '..', 'deployment-betting-localhost.json');
    const hardhatDeploymentPath = path.resolve(process.cwd(), 'deployment-betting-localhost.json');
    const reactAppDeploymentPath = path.resolve(process.cwd(), '..', 'react-app', 'deployment-betting-localhost.json');
    
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