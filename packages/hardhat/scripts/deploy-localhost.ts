import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

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
    const BetM3TokenFactory = await ethers.getContractFactory("BetM3Token");
    const betM3Token = await BetM3TokenFactory.deploy();
    await betM3Token.waitForDeployment();
    const betM3TokenAddress = await betM3Token.getAddress();
    console.log("BetM3Token deployed to:", betM3TokenAddress);

    // Deploy MockCELO
    console.log("Deploying MockCELO...");
    const MockCELOFactory = await ethers.getContractFactory("MockCELO");
    const mockCELO = await MockCELOFactory.deploy();
    await mockCELO.waitForDeployment();
    const mockCELOAddress = await mockCELO.getAddress();
    console.log("MockCELO deployed to:", mockCELOAddress);

    // Deploy cUSDToken
    console.log("Deploying cUSDToken...");
    const cUSDTokenFactory = await ethers.getContractFactory("cUSDToken");
    const cUSDToken = await cUSDTokenFactory.deploy();
    await cUSDToken.waitForDeployment();
    const cUSDTokenAddress = await cUSDToken.getAddress();
    console.log("cUSDToken deployed to:", cUSDTokenAddress);

    // Deploy LPToken
    console.log("Deploying LPToken...");
    const LPTokenFactory = await ethers.getContractFactory("LPToken");
    const lpToken = await LPTokenFactory.deploy();
    await lpToken.waitForDeployment();
    const lpTokenAddress = await lpToken.getAddress();
    console.log("LPToken deployed to:", lpTokenAddress);

    // Deploy UniswapPoolMock
    console.log("Deploying UniswapPoolMock...");
    const UniswapPoolMockFactory = await ethers.getContractFactory("UniswapPoolMock");
    const uniswapPoolMock = await UniswapPoolMockFactory.deploy(
      mockCELOAddress,
      cUSDTokenAddress,
      lpTokenAddress
    );
    await uniswapPoolMock.waitForDeployment();
    const uniswapPoolMockAddress = await uniswapPoolMock.getAddress();
    console.log("UniswapPoolMock deployed to:", uniswapPoolMockAddress);

    // Deploy NoLossBet with MockCELO, cUSD, BetM3Token, LPToken, and UniswapPoolMock addresses
    console.log("Deploying NoLossBet...");
    const NoLossBetFactory = await ethers.getContractFactory("NoLossBet");
    const noLossBet = await NoLossBetFactory.deploy(
      mockCELOAddress,
      cUSDTokenAddress,
      betM3TokenAddress,
      lpTokenAddress,
      uniswapPoolMockAddress
    );
    await noLossBet.waitForDeployment();
    const noLossBetAddress = await noLossBet.getAddress();
    console.log("NoLossBet deployed to:", noLossBetAddress);

    // Mint initial tokens for testing
    console.log("Minting initial tokens for testing...");
    
    // Mint 10,000 CELO to the deployer
    const mintAmount = ethers.parseEther("10000");
    await mockCELO.mint(await deployer.getAddress(), mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} CELO to deployer`);
    
    // Mint 10,000 cUSD to the NoLossBet contract for liquidity
    await cUSDToken.mint(noLossBetAddress, mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} cUSD to NoLossBet contract`);
    
    // Mint 10,000 BetM3Token to the NoLossBet contract for rewards
    await betM3Token.mint(noLossBetAddress, mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} BetM3Token to NoLossBet contract`);

    console.log("\nDeployment complete!");
    
    // Create deployment info object
    const deploymentInfo = {
      network: "localhost",
      addresses: {
        noLossBet: noLossBetAddress,
        mockCELO: mockCELOAddress,
        cUSDToken: cUSDTokenAddress,
        lpToken: lpTokenAddress,
        uniswapPoolMock: uniswapPoolMockAddress,
        betM3Token: betM3TokenAddress
      }
    };

    // Define paths for deployment files
    const rootDeploymentPath = path.resolve(process.cwd(), '..', '..', 'deployment-localhost.json');
    const hardhatDeploymentPath = path.resolve(process.cwd(), 'deployment-localhost.json');
    const reactAppDeploymentPath = path.resolve(process.cwd(), '..', 'react-app', 'deployment-localhost.json');
    
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