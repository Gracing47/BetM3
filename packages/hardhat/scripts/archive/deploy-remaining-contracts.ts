import { ethers } from "hardhat";
import * as fs from 'fs';

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Deploying remaining contracts with account:", deployerAddress);

    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Account balance:", ethers.formatEther(balance), "CELO");

    if (balance < ethers.parseEther("0.1")) {
      throw new Error("Insufficient balance. Please fund your account with test CELO from https://celo.org/developers/faucet");
    }

    // Load the token deployment info
    let tokenDeploymentInfo;
    try {
      tokenDeploymentInfo = JSON.parse(fs.readFileSync('token-deployment.json', 'utf8'));
      console.log("Loaded token deployment info:", tokenDeploymentInfo);
    } catch (error) {
      throw new Error("Failed to load token-deployment.json. Please deploy the BetM3Token first using deploy-token-only.ts");
    }

    const betM3TokenAddress = tokenDeploymentInfo.addresses.betM3Token;
    if (!betM3TokenAddress) {
      throw new Error("BetM3Token address not found in token-deployment.json");
    }
    console.log("Using BetM3Token address:", betM3TokenAddress);

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
      gasLimit: 5000000
    };
    
    // Deploy AavePoolMock with CELO address
    console.log("Deploying AavePoolMock...");
    const CELO_ADDRESS = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // Alfajores CELO
    const AavePoolMockFactory = await ethers.getContractFactory("AavePoolMock");
    const aavePoolMock = await AavePoolMockFactory.deploy(CELO_ADDRESS, overrides);
    
    console.log("AavePoolMock transaction hash:", aavePoolMock.deploymentTransaction()?.hash);
    console.log("Waiting for AavePoolMock transaction to be mined...");
    
    await aavePoolMock.waitForDeployment();
    const aavePoolMockAddress = await aavePoolMock.getAddress();
    console.log("AavePoolMock deployed to:", aavePoolMockAddress);

    // Deploy NoLossBet with CELO, BetM3Token, and AavePoolMock addresses
    console.log("Deploying NoLossBet...");
    const NoLossBetFactory = await ethers.getContractFactory("NoLossBet");
    const noLossBet = await NoLossBetFactory.deploy(
      CELO_ADDRESS,
      betM3TokenAddress,
      aavePoolMockAddress,
      overrides
    );
    
    console.log("NoLossBet transaction hash:", noLossBet.deploymentTransaction()?.hash);
    console.log("Waiting for NoLossBet transaction to be mined...");
    
    await noLossBet.waitForDeployment();
    const noLossBetAddress = await noLossBet.getAddress();
    console.log("NoLossBet deployed to:", noLossBetAddress);

    console.log("\nDeployment complete!");
    console.log({
      noLossBet: noLossBetAddress,
      aavePoolMock: aavePoolMockAddress,
      stakingToken: CELO_ADDRESS,
      betM3Token: betM3TokenAddress
    });

    // Save deployment addresses to a file
    const deploymentInfo = {
      network: "alfajores",
      addresses: {
        noLossBet: noLossBetAddress,
        aavePoolMock: aavePoolMockAddress,
        stakingToken: CELO_ADDRESS,
        betM3Token: betM3TokenAddress
      }
    };
    fs.writeFileSync(
      'deployment-complete.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to deployment-complete.json");

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