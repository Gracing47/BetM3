import { ethers } from "hardhat";
import * as fs from 'fs';

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Deploying BetM3Token with account:", deployerAddress);

    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Account balance:", ethers.formatEther(balance), "CELO");

    if (balance < ethers.parseEther("0.05")) {
      throw new Error("Insufficient balance. Please fund your account with test CELO from https://celo.org/developers/faucet");
    }

    // Get current gas price and add 50% buffer
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("25", "gwei");
    const gasPriceWithBuffer = gasPrice * BigInt(150) / BigInt(100);
    
    console.log("Current gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Using gas price with buffer:", ethers.formatUnits(gasPriceWithBuffer, "gwei"), "gwei");
    
    // Get the current nonce
    const nonce = await ethers.provider.getTransactionCount(deployerAddress);
    console.log("Starting with nonce:", nonce);
    
    const overrides = {
      gasPrice: gasPriceWithBuffer,
      gasLimit: 3000000
    };
    
    // Deploy BetM3Token
    console.log("Deploying BetM3Token...");
    const BetM3TokenFactory = await ethers.getContractFactory("BetM3Token");
    const betM3Token = await BetM3TokenFactory.deploy(overrides);
    
    console.log("BetM3Token transaction hash:", betM3Token.deploymentTransaction()?.hash);
    console.log("Waiting for BetM3Token transaction to be mined...");
    
    await betM3Token.waitForDeployment();
    const betM3TokenAddress = await betM3Token.getAddress();
    console.log("BetM3Token deployed to:", betM3TokenAddress);

    // Save deployment address to a file
    const deploymentInfo = {
      network: "alfajores",
      addresses: {
        betM3Token: betM3TokenAddress
      }
    };
    fs.writeFileSync(
      'token-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nToken deployment info saved to token-deployment.json");

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