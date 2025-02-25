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
    const currentNonce = await ethers.provider.getTransactionCount(deployerAddress, "pending");
    console.log("Current nonce (pending):", currentNonce);
    
    // Get current gas price from the network and add a buffer
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("30", "gwei");
    
    // Add 50% buffer to ensure we're above the minimum
    const gasPriceWithBuffer = gasPrice * BigInt(150) / BigInt(100);
    
    console.log("Current network gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("Using gas price with buffer:", ethers.formatUnits(gasPriceWithBuffer, "gwei"), "gwei");

    // Send a transaction to self to increment nonce
    console.log("Sending transaction to increment nonce...");
    const tx = await deployer.sendTransaction({
      to: deployerAddress,
      value: 0,
      gasPrice: gasPriceWithBuffer,
      gasLimit: 21000, // Standard gas limit for a simple transfer
      nonce: currentNonce
    });

    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for transaction to be mined...");
    
    const receipt = await tx.wait();
    console.log("Transaction mined in block:", receipt?.blockNumber);
    console.log("Transaction successful!");
    
    // Check the new nonce
    const newNonce = await ethers.provider.getTransactionCount(deployerAddress, "pending");
    console.log("New nonce (pending):", newNonce);
    
  } catch (error) {
    console.error("Failed to increment nonce!");
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