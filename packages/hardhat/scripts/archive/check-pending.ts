import { ethers } from "hardhat";

async function main() {
  try {
    // Get the signer
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Account:", deployerAddress);

    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Account balance:", ethers.formatEther(balance), "CELO");

    // Get the current nonce
    const latestNonce = await ethers.provider.getTransactionCount(deployerAddress, "latest");
    const pendingNonce = await ethers.provider.getTransactionCount(deployerAddress, "pending");
    
    console.log("Latest nonce (confirmed):", latestNonce);
    console.log("Pending nonce:", pendingNonce);
    
    if (latestNonce < pendingNonce) {
      console.log(`There are ${pendingNonce - latestNonce} pending transactions.`);
      console.log("This is likely causing the 'replacement transaction underpriced' error.");
      console.log("\nOptions to resolve this issue:");
      console.log("1. Wait for the pending transactions to be mined or dropped from the mempool (could take hours)");
      console.log("2. Use a different account for deployment");
      console.log("3. Try to clear the pending transactions by sending a transaction with the same nonce but higher gas price");
      console.log("\nTo check your pending transactions, visit:");
      console.log(`https://alfajores.celoscan.io/address/${deployerAddress}`);
    } else {
      console.log("No pending transactions detected.");
      console.log("The issue might be with the network or the node you're connecting to.");
    }
    
    // Get current gas price from the network
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("25", "gwei");
    
    console.log("\nCurrent network gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Recommended gas price for new transactions:", ethers.formatUnits(gasPrice * BigInt(150) / BigInt(100), "gwei"), "gwei");
    
  } catch (error) {
    console.error("Failed to check pending transactions!");
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