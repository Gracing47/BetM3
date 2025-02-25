import { ethers } from "hardhat";
import { run } from "hardhat";
import * as fs from 'fs';

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Deploying contracts with account:", deployerAddress);

    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Account balance:", ethers.formatEther(balance), "CELO");

    if (balance === BigInt(0)) {
      throw new Error("Insufficient balance. Please fund your account with test CELO from https://celo.org/developers/faucet");
    }

    // Get the current nonce for the deployer account
    let nonce = await ethers.provider.getTransactionCount(deployerAddress);
    console.log("Starting with nonce:", nonce);

    // Set transaction options with higher gas price
    const txOptions = {
      gasPrice: ethers.parseUnits("50", "gwei"),
      gasLimit: 5000000,
      nonce: nonce++
    };
    
    console.log("Starting deployment with gas price:", ethers.formatUnits(txOptions.gasPrice, "gwei"), "gwei");
    
    // Deploy BetM3Token first
    console.log("Deploying BetM3Token with nonce:", txOptions.nonce);
    const BetM3TokenFactory = await ethers.getContractFactory("BetM3Token");
    const betM3Token = await BetM3TokenFactory.deploy(txOptions);
    await betM3Token.waitForDeployment();
    const betM3TokenAddress = await betM3Token.getAddress();
    console.log("BetM3Token deployed to:", betM3TokenAddress);

    // Deploy AavePoolMock with CELO address
    const CELO_ADDRESS = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // Alfajores CELO
    console.log("Deploying AavePoolMock with nonce:", nonce);
    const AavePoolMockFactory = await ethers.getContractFactory("AavePoolMock");
    const aavePoolMock = await AavePoolMockFactory.deploy(
      CELO_ADDRESS, 
      { ...txOptions, nonce: nonce++ }
    );
    await aavePoolMock.waitForDeployment();
    const aavePoolMockAddress = await aavePoolMock.getAddress();
    console.log("AavePoolMock deployed to:", aavePoolMockAddress);

    // Deploy NoLossBet with CELO, BetM3Token, and AavePoolMock addresses
    console.log("Deploying NoLossBet with nonce:", nonce);
    const NoLossBetFactory = await ethers.getContractFactory("NoLossBet");
    const noLossBet = await NoLossBetFactory.deploy(
      CELO_ADDRESS,
      betM3TokenAddress,
      aavePoolMockAddress,
      { ...txOptions, nonce: nonce++ }
    );
    await noLossBet.waitForDeployment();
    const noLossBetAddress = await noLossBet.getAddress();
    console.log("NoLossBet deployed to:", noLossBetAddress);

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
      'deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to deployment.json");

    console.log("\nDeployment complete!");
    console.log({
      noLossBet: noLossBetAddress,
      aavePoolMock: aavePoolMockAddress,
      stakingToken: CELO_ADDRESS,
      betM3Token: betM3TokenAddress
    });

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