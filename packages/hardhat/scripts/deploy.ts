import { ethers } from "hardhat";

async function main() {
  try {
    // Check network connection and account balance
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "CELO");

    if (balance === BigInt(0)) {
      throw new Error("Insufficient balance. Please fund your account with test CELO from https://celo.org/developers/faucet");
    }

    console.log("Starting deployment...");
    
    // Get the contract factory
    console.log("Getting contract factory...");
    const SimpleBetManager = await ethers.getContractFactory("SimpleBetManager");

    // For testing, we'll use cUSD as the staking token
    const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // Celo Alfajores cUSD
    console.log("Using cUSD address:", CUSD_ADDRESS);
    
    // Deploy SimpleBetManager with cUSD as staking token
    console.log("\nDeploying SimpleBetManager...");
    const simpleBetManager = await SimpleBetManager.deploy(CUSD_ADDRESS);
    console.log("Waiting for SimpleBetManager deployment...");
    await simpleBetManager.waitForDeployment();
    const simpleBetManagerAddress = await simpleBetManager.getAddress();
    console.log("SimpleBetManager deployed to:", simpleBetManagerAddress);

    console.log("\nDeployment complete!");
    console.log({
      simpleBetManager: simpleBetManagerAddress,
      stakingToken: CUSD_ADDRESS
    });

    // Save deployment addresses to a file
    const fs = require('fs');
    const deploymentInfo = {
      network: "alfajores",
      addresses: {
        simpleBetManager: simpleBetManagerAddress,
        stakingToken: CUSD_ADDRESS
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
