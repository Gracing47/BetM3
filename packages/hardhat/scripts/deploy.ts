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

    // Save deployment addresses to a single shared file
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

    // Define the shared deployment file path (in the project root)
    const sharedDeploymentPath = path.join(__dirname, '../../../deployment-localhost.json');
    console.log("Shared deployment path:", sharedDeploymentPath);
    
    // Save to the shared location
    try {
      fs.writeFileSync(
        sharedDeploymentPath,
        JSON.stringify(deploymentInfo, null, 2)
      );
      console.log("\nDeployment info saved to shared location:", sharedDeploymentPath);
    } catch (error) {
      console.error("Error saving to shared location:", error);
      console.log("Trying alternative path...");
      
      // Try an alternative path
      const altSharedPath = path.join(__dirname, '../../deployment-localhost.json');
      console.log("Alternative shared path:", altSharedPath);
      try {
        fs.writeFileSync(
          altSharedPath,
          JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("Deployment info saved to alternative shared location:", altSharedPath);
      } catch (altError) {
        console.error("Error saving to alternative shared location:", altError);
      }
    }

    // Create a copy in the hardhat directory for backward compatibility
    try {
      const hardhatPath = path.join(__dirname, '../deployment-localhost.json');
      console.log("Hardhat deployment path:", hardhatPath);
      
      // Remove existing file if it exists
      if (fs.existsSync(hardhatPath)) {
        fs.unlinkSync(hardhatPath);
        console.log("Removed existing hardhat deployment file");
      }
      
      // Write the file directly
      fs.writeFileSync(
        hardhatPath,
        JSON.stringify(deploymentInfo, null, 2)
      );
      console.log("Created copy in hardhat directory");
    } catch (error) {
      console.warn("Could not create hardhat directory file:", error);
    }

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