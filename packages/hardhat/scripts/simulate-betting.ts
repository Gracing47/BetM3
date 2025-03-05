import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    console.log("Starting betting simulation...");
    
    // Load deployment info
    const deploymentPath = path.resolve(process.cwd(), 'deployment-betting-localhost.json');
    
    if (!fs.existsSync(deploymentPath)) {
      console.error(`Deployment file not found at ${deploymentPath}`);
      console.error("Please run the deployment script first: npx hardhat run scripts/deploy-betting-system.ts --network localhost");
      process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const { cUSDToken: cUSDTokenAddress, bettingContract: bettingContractAddress } = deploymentInfo.addresses;
    
    // Get contract instances - use any type to avoid TS errors
    const cUSDToken = await ethers.getContractAt("cUSDToken", cUSDTokenAddress);
    const bettingContract = await ethers.getContractAt("NoLossBetMulti", bettingContractAddress);
    
    // Get signers (participants)
    const [owner, participant1, participant2, participant3] = await ethers.getSigners();
    
    console.log("Simulation participants:");
    console.log(`Owner/Creator: ${await owner.getAddress()}`);
    console.log(`Participant 1: ${await participant1.getAddress()}`);
    console.log(`Participant 2: ${await participant2.getAddress()}`);
    console.log(`Participant 3: ${await participant3.getAddress()}`);
    
    // Prepare token balances for all participants
    console.log("\nPreparing token balances...");
    
    const mintAmount = ethers.parseEther("1000");
    for (const participant of [participant1, participant2, participant3]) {
      // @ts-ignore - Ignoring TypeScript errors for contract method calls
      await cUSDToken.mint(await participant.getAddress(), mintAmount);
      console.log(`Minted ${ethers.formatEther(mintAmount)} cUSD to ${await participant.getAddress()}`);
    }
    
    // Approve token spending for all participants
    console.log("\nApproving token spending...");
    
    const approveAmount = ethers.parseEther("500");
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await cUSDToken.approve(bettingContractAddress, approveAmount);
    console.log(`Owner approved ${ethers.formatEther(approveAmount)} cUSD`);
    
    for (const participant of [participant1, participant2, participant3]) {
      // @ts-ignore - Ignoring TypeScript errors for contract method calls
      await cUSDToken.connect(participant).approve(bettingContractAddress, approveAmount);
      console.log(`${await participant.getAddress()} approved ${ethers.formatEther(approveAmount)} cUSD`);
    }
    
    // PHASE 1: Create a new bet
    console.log("\n=== PHASE 1: Creating a new bet ===");
    
    const betCondition = "Will Celo reach $10 by the end of the month?";
    const creatorPrediction = true; // Owner predicts TRUE
    const creatorStake = ethers.parseEther("100");
    const betDuration = 7; // 7 days
    
    console.log(`Creating bet: "${betCondition}"`);
    console.log(`Creator prediction: ${creatorPrediction ? "TRUE" : "FALSE"}`);
    console.log(`Creator stake: ${ethers.formatEther(creatorStake)} cUSD`);
    console.log(`Duration: ${betDuration} days`);
    
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    const createTx = await bettingContract.createBet(
      creatorStake,
      betCondition,
      betDuration,
      creatorPrediction
    );
    
    await createTx.wait();
    console.log("Bet created successfully! Bet ID: 0");
    
    // PHASE 2: Participants join the bet
    console.log("\n=== PHASE 2: Participants joining the bet ===");
    
    // Participant 1 bets TRUE (same as creator)
    const stake1 = ethers.parseEther("50");
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await bettingContract.connect(participant1).joinBet(0, stake1, true);
    console.log(`Participant 1 joined with ${ethers.formatEther(stake1)} cUSD on TRUE`);
    
    // Participant 2 bets FALSE (opposite of creator)
    const stake2 = ethers.parseEther("75");
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await bettingContract.connect(participant2).joinBet(0, stake2, false);
    console.log(`Participant 2 joined with ${ethers.formatEther(stake2)} cUSD on FALSE`);
    
    // Participant 3 bets TRUE (same as creator)
    const stake3 = ethers.parseEther("60");
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await bettingContract.connect(participant3).joinBet(0, stake3, true);
    console.log(`Participant 3 joined with ${ethers.formatEther(stake3)} cUSD on TRUE`);
    
    // Get bet details
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    const betDetails = await bettingContract.getBetDetails(0);
    console.log("\nBet Details:");
    console.log(`- Creator: ${betDetails[0]}`);
    console.log(`- Condition: ${betDetails[1]}`);
    console.log(`- Expiration: ${new Date(Number(betDetails[2]) * 1000).toLocaleString()}`);
    console.log(`- Resolved: ${betDetails[3]}`);
    console.log(`- Total Stake TRUE: ${ethers.formatEther(betDetails[4])} cUSD`);
    console.log(`- Total Stake FALSE: ${ethers.formatEther(betDetails[5])} cUSD`);
    
    // PHASE 3: Time travel to expiration (simulating time passing)
    console.log("\n=== PHASE 3: Time travel to bet expiration ===");
    
    // Move time forward to after bet expiration
    await ethers.provider.send("evm_increaseTime", [betDuration * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log("Time advanced past bet expiration");
    
    // PHASE 4: Resolution voting
    console.log("\n=== PHASE 4: Resolution voting ===");
    
    // Creator votes
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await bettingContract.submitResolutionOutcome(0, true);
    console.log("Creator voted TRUE");
    
    // Participant 1 votes
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await bettingContract.connect(participant1).submitResolutionOutcome(0, true);
    console.log("Participant 1 voted TRUE");
    
    // Participant 2 votes
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await bettingContract.connect(participant2).submitResolutionOutcome(0, false);
    console.log("Participant 2 voted FALSE");
    
    // Participant 3 votes
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    await bettingContract.connect(participant3).submitResolutionOutcome(0, true);
    console.log("Participant 3 voted TRUE");
    
    // PHASE 5: Time travel past resolution period
    console.log("\n=== PHASE 5: Time travel past resolution period ===");
    
    // Move time forward past the resolution period
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    console.log("Time advanced past resolution period");
    
    // PHASE 6: Finalize the bet resolution
    console.log("\n=== PHASE 6: Finalizing bet resolution ===");
    
    // Get balances before finalizing
    const balancesBefore: Record<string, bigint> = {};
    for (const [name, signer] of [
      ["Owner", owner],
      ["Participant 1", participant1],
      ["Participant 2", participant2],
      ["Participant 3", participant3]
    ] as const) {
      const address = await signer.getAddress();
      // @ts-ignore - Ignoring TypeScript errors for contract method calls
      balancesBefore[name] = await cUSDToken.balanceOf(address);
      console.log(`${name} balance before: ${ethers.formatEther(balancesBefore[name])} cUSD`);
    }
    
    try {
      // Try automatic finalization (should work as TRUE side has majority)
      // @ts-ignore - Ignoring TypeScript errors for contract method calls
      const finalizeTx = await bettingContract.finalizeResolution(0);
      await finalizeTx.wait();
      console.log("Bet automatically finalized based on 80% supermajority!");
    } catch (error) {
      console.log("Automatic finalization failed, trying admin finalization...");
      // Fallback to admin finalization
      // @ts-ignore - Ignoring TypeScript errors for contract method calls
      const adminFinalizeTx = await bettingContract.adminFinalizeResolution(0, true, false);
      await adminFinalizeTx.wait();
      console.log("Bet resolved by admin with TRUE as the winning outcome");
    }
    
    // PHASE 7: Check results and balances
    console.log("\n=== PHASE 7: Checking results and final balances ===");
    
    // Get bet details after resolution
    // @ts-ignore - Ignoring TypeScript errors for contract method calls
    const resolvedBetDetails = await bettingContract.getBetDetails(0);
    console.log("Resolved Bet Details:");
    console.log(`- Resolved: ${resolvedBetDetails[3]}`);
    console.log(`- Resolution Finalized: ${resolvedBetDetails[6]}`);
    console.log(`- Winning Outcome: ${resolvedBetDetails[7] ? "TRUE" : "FALSE"}`);
    
    // Get balances after finalizing
    console.log("\nFinal Balances:");
    for (const [name, signer] of [
      ["Owner", owner],
      ["Participant 1", participant1],
      ["Participant 2", participant2],
      ["Participant 3", participant3]
    ] as const) {
      const address = await signer.getAddress();
      // @ts-ignore - Ignoring TypeScript errors for contract method calls
      const balanceAfter = await cUSDToken.balanceOf(address);
      const difference = balanceAfter - balancesBefore[name];
      
      console.log(`${name} balance after: ${ethers.formatEther(balanceAfter)} cUSD`);
      console.log(`${name} difference: ${ethers.formatEther(difference)} cUSD`);
    }
    
    console.log("\nBetting simulation completed successfully!");
    
  } catch (error) {
    console.error("Simulation failed!");
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 