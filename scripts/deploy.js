const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
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

  // Deploy NoLossBet with all the necessary addresses
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
    uniswapPoolMock: uniswapPoolMockAddress,
    mockCELO: mockCELOAddress,
    cUSDToken: cUSDTokenAddress,
    lpToken: lpTokenAddress,
    betM3Token: betM3TokenAddress
  });

  // Save deployment addresses to a file
  const fs = require('fs');
  const deploymentInfo = {
    network: "localhost",
    addresses: {
      noLossBet: noLossBetAddress,
      uniswapPoolMock: uniswapPoolMockAddress,
      celoToken: mockCELOAddress,
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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 