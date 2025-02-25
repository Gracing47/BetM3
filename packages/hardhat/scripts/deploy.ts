import { ethers } from "hardhat";
import { run } from "hardhat";
import * as fs from 'fs';
import { BetM3Token, NoLossBet, AavePoolMock } from "../typechain-types";

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", await deployer.getAddress());

    const balance = await ethers.provider.getBalance(await deployer.getAddress());
    console.log("Account balance:", ethers.formatEther(balance), "CELO");

    if (balance === BigInt(0)) {
      throw new Error("Insufficient balance. Please fund your account with test CELO from https://celo.org/developers/faucet");
    }

    console.log("Starting deployment...");
    
    // Deploy BetM3Token first
    const BetM3TokenFactory = await ethers.getContractFactory("BetM3Token");
    const betM3Token = await BetM3TokenFactory.deploy();
    const betM3TokenAddress = await betM3Token.getAddress();
    console.log("BetM3Token deployed to:", betM3TokenAddress);

    // Deploy AavePoolMock with CELO address
    const CELO_ADDRESS = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // Alfajores CELO
    const AavePoolMockFactory = await ethers.getContractFactory("AavePoolMock");
    const aavePoolMock = await AavePoolMockFactory.deploy(CELO_ADDRESS);
    const aavePoolMockAddress = await aavePoolMock.getAddress();
    console.log("AavePoolMock deployed to:", aavePoolMockAddress);

    // Deploy NoLossBet with CELO, BetM3Token, and AavePoolMock addresses
    const NoLossBetFactory = await ethers.getContractFactory("NoLossBet");
    const noLossBet = await NoLossBetFactory.deploy(
      CELO_ADDRESS,
      betM3TokenAddress,
      aavePoolMockAddress
    );
    const noLossBetAddress = await noLossBet.getAddress();
    console.log("NoLossBet deployed to:", noLossBetAddress);

    // Verify contracts on Celoscan (optional)
    if (process.env.CELOSCAN_API_KEY) {
      await run("verify:verify", {
        address: betM3TokenAddress,
        constructorArguments: [],
      });

      await run("verify:verify", {
        address: aavePoolMockAddress,
        constructorArguments: [CELO_ADDRESS],
      });

      await run("verify:verify", {
        address: noLossBetAddress,
        constructorArguments: [CELO_ADDRESS, betM3TokenAddress, aavePoolMockAddress],
      });
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
      'deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to deployment.json");

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
