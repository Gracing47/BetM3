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

    // For localhost, we'll use a mock address for CELO
    const CELO_ADDRESS = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; 
    
    // Deploy cUSDToken
    console.log("Deploying cUSDToken...");
    const cUSDTokenFactory = await ethers.getContractFactory("packages/hardhat/contracts/cUSDToken.sol:cUSDToken");
    const cUSDToken = await cUSDTokenFactory.deploy();
    await cUSDToken.waitForDeployment();
    const cUSDTokenAddress = await cUSDToken.getAddress();
    console.log("cUSDToken deployed to:", cUSDTokenAddress);
    
    // Deploy LPToken
    console.log("Deploying LPToken...");
    const LPTokenFactory = await ethers.getContractFactory("packages/hardhat/contracts/LPToken.sol:LPToken");
    const lpToken = await LPTokenFactory.deploy();
    await lpToken.waitForDeployment();
    const lpTokenAddress = await lpToken.getAddress();
    console.log("LPToken deployed to:", lpTokenAddress);

    // Deploy UniswapPoolMock
    console.log("Deploying UniswapPoolMock...");
    const UniswapPoolMockFactory = await ethers.getContractFactory("packages/hardhat/contracts/UniswapPoolMock.sol:UniswapPoolMock");
    const uniswapPoolMock = await UniswapPoolMockFactory.deploy(
      CELO_ADDRESS,
      cUSDTokenAddress,
      lpTokenAddress
    );
    await uniswapPoolMock.waitForDeployment();
    const uniswapPoolMockAddress = await uniswapPoolMock.getAddress();
    console.log("UniswapPoolMock deployed to:", uniswapPoolMockAddress);

    // Deploy NoLossBet with CELO, cUSD, BetM3Token, LPToken, and UniswapPoolMock addresses
    console.log("Deploying NoLossBet...");
    const NoLossBetFactory = await ethers.getContractFactory("packages/hardhat/contracts/NoLossBet.sol:NoLossBet");
    const noLossBet = await NoLossBetFactory.deploy(
      CELO_ADDRESS,
      cUSDTokenAddress,
      betM3TokenAddress,
      lpTokenAddress,
      uniswapPoolMockAddress
    );
    await noLossBet.waitForDeployment();
    const noLossBetAddress = await noLossBet.getAddress();
    console.log("NoLossBet deployed to:", noLossBetAddress);

    console.log("\nDeployment complete!");
    console.log({
      noLossBet: noLossBetAddress,
      uniswapPoolMock: uniswapPoolMockAddress,
      celoToken: CELO_ADDRESS,
      cUSDToken: cUSDTokenAddress,
      lpToken: lpTokenAddress,
      betM3Token: betM3TokenAddress
    });

    // Save deployment addresses to a file
    const deploymentInfo = {
      network: "localhost",
      addresses: {
        noLossBet: noLossBetAddress,
        uniswapPoolMock: uniswapPoolMockAddress,
        celoToken: CELO_ADDRESS,
        cUSDToken: cUSDTokenAddress,
        lpToken: lpTokenAddress,
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