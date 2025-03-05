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

    // Create a betting contract instance through the factory
    console.log("Creating betting contract instance...");
    const createTx = await bettingManagerFactory.createBettingContract(cUSDTokenAddress);
    const receipt = await createTx.wait();
    
    // Verbesserte Behandlung zum Extrahieren der Betting-Contract-Adresse
    console.log("Extracting betting contract address from transaction logs...");
    let bettingContractAddress;
    
    if (receipt && receipt.logs && receipt.logs.length > 0) {
      const event = receipt.logs[0];
      
      try {
        const parsedLog = bettingManagerFactory.interface.parseLog({
          topics: event.topics as string[],
          data: event.data as string
        });
        
        if (parsedLog && parsedLog.args && parsedLog.args.length > 0) {
          bettingContractAddress = parsedLog.args[0];
          console.log("Successfully extracted betting contract address:", bettingContractAddress);
        }
      } catch (error) {
        console.error("Error parsing event log:", error);
      }
    }
    
    // Fallback: Versuchen, alle erzeugten Verträge über die Factory abzurufen
    if (!bettingContractAddress) {
      console.log("Could not extract address from event, trying to get it from the factory...");
      // @ts-ignore
      const contractCount = await bettingManagerFactory.getBettingContractsCount();
      if (contractCount > 0) {
        // @ts-ignore
        bettingContractAddress = await bettingManagerFactory.getBettingContract(contractCount - 1);
        console.log("Retrieved betting contract address from factory:", bettingContractAddress);
      } else {
        console.error("No betting contracts found in the factory.");
        bettingContractAddress = "0x0000000000000000000000000000000000000000";
      }
    }
    
    console.log("NoLossBetMulti instance created at:", bettingContractAddress);

    // Get the betting contract
    const NoLossBetMulti = await ethers.getContractFactory("NoLossBetMulti");
    const bettingContract = NoLossBetMulti.attach(bettingContractAddress);

    // Mint initial tokens for testing
    console.log("Minting initial tokens for testing...");
    
    // Mint 10,000 cUSD to the deployer
    const mintAmount = ethers.parseEther("10000");
    await cUSDToken.mint(await deployer.getAddress(), mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} cUSD to deployer`);

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