
import { ethers } from "hardhat";

async function main() {
  try {
    // Get the current account
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Sending from account:", deployerAddress);
    
    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Current account balance:", ethers.formatEther(balance), "CELO");
    
    // New account address
    const newAccountAddress = "0x2ffF7A6544c4b925c3180b9a4118e7381c3c9120";
    console.log("Sending to new account:", newAccountAddress);
    
    // Transfer amount
    const transferAmount = ethers.parseEther("0.2");
    console.log("Transfer amount:", ethers.formatEther(transferAmount), "CELO");
    
    // Get current gas price from the network and add a buffer
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("25", "gwei");
    const gasPriceWithBuffer = gasPrice * BigInt(150) / BigInt(100);
    
    console.log("Using gas price:", ethers.formatUnits(gasPriceWithBuffer, "gwei"), "gwei");
    
    // Send transaction
    console.log("Sending transaction...");
    const tx = await deployer.sendTransaction({
      to: newAccountAddress,
      value: transferAmount,
      gasPrice: gasPriceWithBuffer,
      gasLimit: 21000 // Standard gas limit for a simple transfer
    });
    
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for transaction to be mined...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt?.blockNumber);
    console.log("Transaction successful!");
    
    // Check new balance
    const newBalance = await ethers.provider.getBalance(newAccountAddress);
    console.log("New account balance:", ethers.formatEther(newBalance), "CELO");
    
    console.log("\nNow update your hardhat.config.js to use the new private key:");
    console.log("1. Open packages/hardhat/.env");
    console.log("2. Replace the existing PRIVATE_KEY with the new one from packages/hardhat/.env.new");
    console.log("3. Run your deployment script again");
    
  } catch (error) {
    console.error("Transfer failed!");
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
