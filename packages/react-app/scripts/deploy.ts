import { ethers } from "hardhat";
import { run } from "hardhat";
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
    const CUSDTokenFactory = await ethers.getContractFactory("cUSDToken");
    const cUSDToken = await CUSDTokenFactory.deploy();
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

    // Deploy UniswapPoolMock with the required parameters
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

    // Deploy NoLossBet with all required addresses
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

    console.log("\nDeployment complete!");
    console.log({
      noLossBet: noLossBetAddress,
      mockCELO: mockCELOAddress,
      cUSDToken: cUSDTokenAddress,
      lpToken: lpTokenAddress,
      uniswapPoolMock: uniswapPoolMockAddress,
      betM3Token: betM3TokenAddress
    });

    // Save deployment addresses to a file in both hardhat and react-app directories
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

    // Convert to JSON string with proper formatting
    const deploymentJson = JSON.stringify(deploymentInfo, null, 2);
    
    // Define file paths
    const hardhatDeploymentPath = path.resolve('deployment-localhost.json');
    const reactAppDeploymentPath = path.resolve('../react-app/deployment-localhost.json');
    
    // Write to both locations
    fs.writeFileSync(hardhatDeploymentPath, deploymentJson);
    fs.writeFileSync(reactAppDeploymentPath, deploymentJson);
    
    console.log("\nDeployment info saved to deployment-localhost.json in both hardhat and react-app directories");

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