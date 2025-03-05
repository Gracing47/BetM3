import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Einfaches Deployment-Skript für lokale Tests des No-Loss-Betting-Systems
 */
async function main() {
  try {
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", await deployer.getAddress());

    // Deploy cUSDToken
    console.log("\nDeploying cUSDToken...");
    const CUSDTokenFactory = await ethers.getContractFactory("cUSDToken");
    const cUSDToken = await CUSDTokenFactory.deploy();
    await cUSDToken.waitForDeployment();
    const cUSDTokenAddress = await cUSDToken.getAddress();
    console.log("cUSDToken deployed to:", cUSDTokenAddress);

    // Deploy BettingManagerFactory
    console.log("\nDeploying BettingManagerFactory...");
    const BettingManagerFactoryFactory = await ethers.getContractFactory("BettingManagerFactory");
    const bettingManagerFactory = await BettingManagerFactoryFactory.deploy();
    await bettingManagerFactory.waitForDeployment();
    const bettingManagerFactoryAddress = await bettingManagerFactory.getAddress();
    console.log("BettingManagerFactory deployed to:", bettingManagerFactoryAddress);

    // Deploy NoLossBetMulti directly (ohne Factory)
    console.log("\nDeploying NoLossBetMulti directly...");
    const NoLossBetMultiFactory = await ethers.getContractFactory("NoLossBetMulti");
    const noLossBetMulti = await NoLossBetMultiFactory.deploy(cUSDTokenAddress);
    await noLossBetMulti.waitForDeployment();
    const noLossBetMultiAddress = await noLossBetMulti.getAddress();
    console.log("NoLossBetMulti deployed to:", noLossBetMultiAddress);

    // Mint initial tokens for testing
    console.log("\nMinting initial tokens for testing...");
    
    // Mint 10,000 cUSD to the deployer
    const mintAmount = ethers.parseEther("10000");
    // @ts-ignore
    await cUSDToken.mint(await deployer.getAddress(), mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} cUSD to deployer`);

    // Set a custom yield rate (optional)
    // @ts-ignore
    await noLossBetMulti.setYieldRate(10); // 10% yield instead of default 5%
    console.log("Set custom yield rate: 10%");

    // Create deployment info object
    const deploymentInfo = {
      network: "localhost",
      addresses: {
        cUSDToken: cUSDTokenAddress,
        bettingManagerFactory: bettingManagerFactoryAddress,
        bettingContract: noLossBetMultiAddress
      }
    };

    // Define paths for deployment files
    const rootDeploymentPath = path.resolve(process.cwd(), '..', '..', 'deployment-betting-localhost.json');
    const hardhatDeploymentPath = path.resolve(process.cwd(), 'deployment-betting-localhost.json');
    const reactAppDeploymentPath = path.resolve(process.cwd(), '..', 'react-app', 'deployment-betting-localhost.json');
    
    // Save deployment info
    fs.writeFileSync(
      rootDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\nDeployment info saved to: ${rootDeploymentPath}`);
    
    fs.writeFileSync(
      hardhatDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Deployment info copied to: ${hardhatDeploymentPath}`);
    
    fs.writeFileSync(
      reactAppDeploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Deployment info copied to: ${reactAppDeploymentPath}`);
    
    console.log("\nContract Addresses:");
    console.log(JSON.stringify(deploymentInfo.addresses, null, 2));
    console.log("\nDeployment complete!");
    
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