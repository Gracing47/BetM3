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
    
    // Use a very high gas price to ensure transaction goes through
    const gasPrice = ethers.parseUnits("40", "gwei");
    console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

    // Send a transaction to self with the current nonce
    console.log("Sending transaction to reset nonce...");
    const tx = await deployer.sendTransaction({
      to: deployerAddress,
      value: ethers.parseEther("0.0001"), // Send a tiny amount to make it different
      gasPrice: gasPrice,
      gasLimit: 21000, // Standard gas limit for a simple transfer
      nonce: currentNonce
    });

    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for transaction to be mined...");
    
    // Don't wait for receipt - just let it process
    console.log("Transaction submitted. Check explorer for status.");
    console.log("Explorer URL: https://alfajores.celoscan.io/tx/" + tx.hash);
    
  } catch (error) {
    console.error("Failed to reset nonce!");
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