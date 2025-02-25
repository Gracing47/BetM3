import { ethers } from "hardhat";
import * as fs from 'fs';

async function main() {
  try {
    // Create a new random wallet
    const wallet = ethers.Wallet.createRandom();
    console.log("New account created!");
    console.log("Address:", wallet.address);
    console.log("Private Key:", wallet.privateKey);
    
    // Save the private key to a file
    const envContent = `PRIVATE_KEY_NEW=${wallet.privateKey.slice(2)}\n`;
    fs.writeFileSync('packages/hardhat/.env.new', envContent);
    console.log("\nPrivate key saved to packages/hardhat/.env.new");
    
    // Get the current account
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("\nCurrent account:", deployerAddress);
    
    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("Current account balance:", ethers.formatEther(balance), "CELO");
    
    // Calculate a reasonable amount to transfer (0.2 CELO)
    const transferAmount = ethers.parseEther("0.2");
    
    console.log("\nTo transfer CELO to the new account, run this command:");
    console.log(`npx hardhat run packages/hardhat/scripts/transfer-celo.ts --network alfajores`);
    
    // Create the transfer script
    const transferScript = `
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
    const newAccountAddress = "${wallet.address}";
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
    
    console.log("\\nNow update your hardhat.config.js to use the new private key:");
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
`;
    
    fs.writeFileSync('packages/hardhat/scripts/transfer-celo.ts', transferScript);
    console.log("Transfer script created at packages/hardhat/scripts/transfer-celo.ts");
    
  } catch (error) {
    console.error("Failed to create account!");
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