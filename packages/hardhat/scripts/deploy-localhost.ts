import { ethers } from "hardhat";
import { run } from "hardhat";
import * as fs from 'fs';

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", await deployer.getAddress());

    const balance = await ethers.provider.getBalance(await deployer.getAddress());
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    console.log("Starting deployment...");
    
    // Deploy BetM3Token first
    console.log("Deploying BetM3Token...");
    const BetM3TokenFactory = await ethers.getContractFactory("packages/hardhat/contracts/BetM3Token.sol:BetM3Token");
    const betM3Token = await BetM3TokenFactory.deploy();
    await betM3Token.waitForDeployment();
    const betM3TokenAddress = await betM3Token.getAddress();
    console.log("BetM3Token deployed to:", betM3TokenAddress);

    // Deploy AavePoolMock with mock CELO address
    console.log("Deploying AavePoolMock...");
    // For localhost, we'll use a mock address for CELO
    const CELO_ADDRESS = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; 
    const AavePoolMockFactory = await ethers.getContractFactory("packages/hardhat/contracts/AavePoolMock.sol:AavePoolMock");
    const aavePoolMock = await AavePoolMockFactory.deploy(CELO_ADDRESS);
    await aavePoolMock.waitForDeployment();
    const aavePoolMockAddress = await aavePoolMock.getAddress();
    console.log("AavePoolMock deployed to:", aavePoolMockAddress);

    // Deploy NoLossBet with CELO, BetM3Token, and AavePoolMock addresses
    console.log("Deploying NoLossBet...");
    const NoLossBetFactory = await ethers.getContractFactory("packages/hardhat/contracts/NoLossBet.sol:NoLossBet");
    const noLossBet = await NoLossBetFactory.deploy(
      CELO_ADDRESS,
      betM3TokenAddress,
      aavePoolMockAddress
    );
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
      network: "localhost",
      addresses: {
        noLossBet: noLossBetAddress,
        aavePoolMock: aavePoolMockAddress,
        stakingToken: CELO_ADDRESS,
        betM3Token: betM3TokenAddress
      }
    };
    fs.writeFileSync(
      'deployment-localhost.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info saved to deployment-localhost.json");

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