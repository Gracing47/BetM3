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

    if (balance < ethers.parseEther("0.1")) {
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
      gasLimit: 5000000
    };
    
    console.log("Starting deployment...");
    
    // Deploy BetM3Token first
    console.log("Deploying BetM3Token...");
    const BetM3TokenFactory = await ethers.getContractFactory("BetM3Token");
    const betM3Token = await BetM3TokenFactory.deploy(overrides);
    
    console.log("BetM3Token transaction hash:", betM3Token.deploymentTransaction()?.hash);
    console.log("Waiting for BetM3Token transaction to be mined...");
    
    await betM3Token.waitForDeployment();
    const betM3TokenAddress = await betM3Token.getAddress();
    console.log("BetM3Token deployed to:", betM3TokenAddress);

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

    // Verify contracts on Celoscan (optional)
    if (process.env.CELOSCAN_API_KEY) {
      console.log("Verifying contracts on Celoscan...");
      try {
        await run("verify:verify", {
          address: betM3TokenAddress,
          constructorArguments: [],
        });
      } catch (error) {
        console.log("Error verifying BetM3Token:", error);
      }

      try {
        await run("verify:verify", {
          address: aavePoolMockAddress,
          constructorArguments: [CELO_ADDRESS],
        });
      } catch (error) {
        console.log("Error verifying AavePoolMock:", error);
      }

      try {
        await run("verify:verify", {
          address: noLossBetAddress,
          constructorArguments: [CELO_ADDRESS, betM3TokenAddress, aavePoolMockAddress],
        });
      } catch (error) {
        console.log("Error verifying NoLossBet:", error);
      }
    }

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
      'deployment-alfajores.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to deployment-alfajores.json");

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