import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

// This script allows updating various parameters of an existing betting contract
async function main() {
  try {
    console.log("Starting betting system configuration update...");
    
    // Load deployment info
    const deploymentPath = path.resolve(process.cwd(), 'deployment-betting-localhost.json');
    
    if (!fs.existsSync(deploymentPath)) {
      console.error(`Deployment file not found at ${deploymentPath}`);
      console.error("Please run the deployment script first: npx hardhat run scripts/deploy-betting-system.ts --network localhost");
      process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const { bettingContract: bettingContractAddress } = deploymentInfo.addresses;
    
    // Get the NoLossBetMulti contract instance
    const noLossBetMulti = await ethers.getContractAt("NoLossBetMulti", bettingContractAddress);
    
    // Get current yield rate
    const currentYieldRate = await noLossBetMulti.yieldRate();
    console.log(`Current yield rate: ${currentYieldRate}%`);
    
    // Set new yield rate (e.g., to 15%)
    const newYieldRate = 15;
    console.log(`Setting new yield rate to: ${newYieldRate}%`);
    
    const tx = await noLossBetMulti.setYieldRate(newYieldRate);
    await tx.wait();
    
    // Verify the update
    const updatedYieldRate = await noLossBetMulti.yieldRate();
    console.log(`Updated yield rate: ${updatedYieldRate}%`);
    
    console.log("Configuration update completed successfully!");
    
  } catch (error) {
    console.error("Configuration update failed!");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 