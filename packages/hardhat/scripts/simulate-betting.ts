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
    
    // Get contract instances
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
    
    // TypeScript-freundliche Version, die Contract-Aufrufe korrekt typisiert
    for (const participant of [participant1, participant2, participant3]) {
      await cUSDToken.connect(owner).mint(await participant.getAddress(), mintAmount);
      console.log(`Minted ${ethers.formatEther(mintAmount)} cUSD to ${await participant.getAddress()}`);
    }
    
    // Approve token spending for all participants
    console.log("\nApproving token spending...");
    
    const approveAmount = ethers.parseEther("500");
    await cUSDToken.connect(owner).approve(bettingContractAddress, approveAmount);
    console.log(`Owner approved ${ethers.formatEther(approveAmount)} cUSD`);
    
    for (const participant of [participant1, participant2, participant3]) {
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
    
    const createTx = await bettingContract.connect(owner).createBet(
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
    await bettingContract.connect(participant1).joinBet(0, stake1, true);
    console.log(`Participant 1 joined with ${ethers.formatEther(stake1)} cUSD on TRUE`);
    
    // Participant 2 bets FALSE (opposite of creator)
    const stake2 = ethers.parseEther("75");
    await bettingContract.connect(participant2).joinBet(0, stake2, false);
    console.log(`Participant 2 joined with ${ethers.formatEther(stake2)} cUSD on FALSE`);
    
    // Participant 3 bets TRUE (same as creator)
    const stake3 = ethers.parseEther("60");
    await bettingContract.connect(participant3).joinBet(0, stake3, true);
    console.log(`Participant 3 joined with ${ethers.formatEther(stake3)} cUSD on TRUE`);
    
    // Get bet details
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
    await bettingContract.connect(owner).submitResolutionOutcome(0, true);
    console.log("Creator voted TRUE");
    
    // Participant 1 votes
    await bettingContract.connect(participant1).submitResolutionOutcome(0, true);
    console.log("Participant 1 voted TRUE");
    
    // Participant 2 votes
    await bettingContract.connect(participant2).submitResolutionOutcome(0, false);
    console.log("Participant 2 voted FALSE");
    
    // Participant 3 votes
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
    const balancesBefore = new Map<string, bigint>();
    for (const [name, signer] of [
      ["Owner", owner],
      ["Participant 1", participant1],
      ["Participant 2", participant2],
      ["Participant 3", participant3]
    ] as const) {
      const address = await signer.getAddress();
      const balance = await cUSDToken.balanceOf(address);
      balancesBefore.set(name, balance);
      console.log(`${name} balance before: ${ethers.formatEther(balance)} cUSD`);
    }
    
    // Sicherstellen, dass der Betting-Vertrag genügend Token für Yield-Zahlungen hat
    const contractBalanceBefore = await cUSDToken.balanceOf(bettingContractAddress);
    
    // Berechne benötigten Yield
    const totalStake = betDetails[4] + betDetails[5]; // totalStakeTrue + totalStakeFalse
    const yieldRateBN = await bettingContract.yieldRate();
    const yieldRate = Number(yieldRateBN);
    const requiredYield = totalStake * BigInt(yieldRate) / BigInt(100);
    
    // Prüfen, ob genügend Token im Vertrag sind
    if (contractBalanceBefore < totalStake + requiredYield) {
      console.log(`Contract needs additional tokens for yield payments`);
      console.log(`Current balance: ${ethers.formatEther(contractBalanceBefore)} cUSD`);
      console.log(`Total stake: ${ethers.formatEther(totalStake)} cUSD`);
      console.log(`Required yield: ${ethers.formatEther(requiredYield)} cUSD`);
      
      const additionalTokensNeeded = totalStake + requiredYield - contractBalanceBefore;
      const extraTokens = ethers.parseEther("5"); // 5 extra cUSD as safety margin
      const amountToMint = additionalTokensNeeded + extraTokens;
      
      // Mint additional tokens to the contract
      await cUSDToken.connect(owner).mint(bettingContractAddress, amountToMint);
      console.log(`Minted ${ethers.formatEther(amountToMint)} additional cUSD to betting contract for yield payments`);
      
      const newContractBalance = await cUSDToken.balanceOf(bettingContractAddress);
      console.log(`New contract balance: ${ethers.formatEther(newContractBalance)} cUSD`);
    } else {
      console.log(`Contract has sufficient tokens for yield payments: ${ethers.formatEther(contractBalanceBefore)} cUSD`);
    }
    
    try {
      // Try automatic finalization (should work as TRUE side has majority)
      const finalizeTx = await bettingContract.connect(owner).finalizeResolution(0);
      await finalizeTx.wait();
      console.log("Bet automatically finalized based on supermajority!");
    } catch (error) {
      console.log("Automatic finalization failed, trying admin finalization...");
      // Fallback to admin finalization
      const adminFinalizeTx = await bettingContract.connect(owner).adminFinalizeResolution(0, true, false);
      await adminFinalizeTx.wait();
      console.log("Bet resolved by admin with TRUE as the winning outcome");
    }
    
    // PHASE 7: Check results and balances
    console.log("\n=== PHASE 7: Checking results and final balances ===");
    
    // Get bet details after resolution
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
      const balanceAfter = await cUSDToken.balanceOf(address);
      const previousBalance = balancesBefore.get(name) || BigInt(0);
      const difference = balanceAfter - previousBalance;
      
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