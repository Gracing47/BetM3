const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  try {
    // Laden der Deployment-Adressen
    const deploymentInfo = JSON.parse(fs.readFileSync('deployment-localhost.json', 'utf8'));
    const addresses = deploymentInfo.addresses;

    console.log("Testing interactions with deployed contracts:");
    console.log("Addresses:", addresses);

    // Get Signers
    const [deployer, opponent] = await ethers.getSigners();
    console.log("Creator account:", await deployer.getAddress());
    console.log("Opponent account:", await opponent.getAddress());

    // Lade die Contract-Instanzen
    const MockCELO = await ethers.getContractFactory("MockCELO");
    const mockCELO = MockCELO.attach(addresses.celoToken);

    const MockCUSD = await ethers.getContractFactory("MockCELO"); // Wir verwenden MockCELO als cUSD
    const mockCUSD = MockCUSD.attach(addresses.cUSDToken);

    const BetM3Token = await ethers.getContractFactory("BetM3Token");
    const betM3Token = BetM3Token.attach(addresses.betM3Token);

    const NoLossBet = await ethers.getContractFactory("NoLossBet");
    const noLossBet = NoLossBet.attach(addresses.noLossBet);

    // Prüfe CELO-Balance
    const creatorCeloBalance = await mockCELO.balanceOf(await deployer.getAddress());
    console.log("Creator CELO Balance:", ethers.formatEther(creatorCeloBalance));

    // Genehmige CELO für NoLossBet (Creator)
    const approvalAmount = ethers.parseEther("10"); // Kleinerer Betrag
    console.log("Creator approving CELO for NoLossBet:", ethers.formatEther(approvalAmount));
    await mockCELO.approve(addresses.noLossBet, approvalAmount);
    console.log("Creator approval successful");

    // Sende CELO an Opponent
    const transferAmount = ethers.parseEther("20");
    console.log("Transferring CELO to opponent:", ethers.formatEther(transferAmount));
    await mockCELO.transfer(await opponent.getAddress(), transferAmount);
    
    // Erstelle eine Wette mit kleineren Beträgen
    const creatorStake = ethers.parseEther("5"); // 5 CELO statt 100
    const opponentStake = ethers.parseEther("2"); // 2 CELO statt 10
    const condition = "Team A wins";
    const tokenURI = "ipfs://QmExample";
    
    console.log("Creating bet with creator stake:", ethers.formatEther(creatorStake));
    console.log("Creating bet with opponent stake:", ethers.formatEther(opponentStake));
    console.log("Condition:", condition);
    console.log("Token URI:", tokenURI);
    
    // Prüfe, ob die createBet-Funktion den creatorStake-Parameter akzeptiert
    const createTx = await noLossBet.createBet(
      opponentStake,
      condition,
      tokenURI,
      { gasLimit: 1000000 }
    );
    
    const createReceipt = await createTx.wait();
    console.log("Bet created successfully, tx hash:", createReceipt.hash);
    
    // Extrahiere die BetID aus dem Event
    const betCreatedEvent = createReceipt.logs
      .filter(log => {
        try {
          const parsed = noLossBet.interface.parseLog(log);
          return parsed && parsed.name === 'BetCreated';
        } catch (e) {
          return false;
        }
      })
      .map(log => noLossBet.interface.parseLog(log))[0];
    
    if (!betCreatedEvent) {
      console.error("Could not find BetCreated event in logs");
      console.log("Available logs:", createReceipt.logs);
      return;
    }
    
    const betId = betCreatedEvent.args.betId;
    console.log("Bet ID:", betId);
    
    // Hole Wettdetails vor der Akzeptanz
    const betDetails = await noLossBet.bets(betId);
    console.log("Bet Details before acceptance:", {
      creator: betDetails.creator,
      opponent: betDetails.opponent,
      creatorStake: ethers.formatEther(betDetails.creatorStake),
      opponentStake: ethers.formatEther(betDetails.opponentStake),
      condition: betDetails.condition,
      resolved: betDetails.resolved,
      expiration: new Date(Number(betDetails.expiration) * 1000).toLocaleString()
    });
    
    // Berechne den benötigten Betrag für stableToken (cUSD)
    const totalStake = BigInt(betDetails.creatorStake) + BigInt(betDetails.opponentStake);
    const halfStake = totalStake / 2n;
    console.log("Total stake:", ethers.formatEther(totalStake));
    console.log("Half stake needed for liquidity:", ethers.formatEther(halfStake));
    
    // Owner (deployer) genehmigt stableToken (cUSD) für NoLossBet
    console.log("Owner approving cUSD for NoLossBet:", ethers.formatEther(halfStake));
    await mockCUSD.approve(addresses.noLossBet, halfStake);
    console.log("Owner cUSD approval successful");
    
    // Opponent genehmigt CELO für NoLossBet
    console.log("Opponent approving CELO for NoLossBet:", ethers.formatEther(opponentStake));
    await mockCELO.connect(opponent).approve(addresses.noLossBet, opponentStake);
    console.log("Opponent approval successful");

    // Prüfe Opponent CELO-Balance
    const opponentCeloBalance = await mockCELO.balanceOf(await opponent.getAddress());
    console.log("Opponent CELO Balance:", ethers.formatEther(opponentCeloBalance));
    
    // Opponent akzeptiert die Wette
    console.log("Opponent accepting bet with ID:", betId);
    const acceptTx = await noLossBet.connect(opponent).acceptBet(betId, { gasLimit: 1000000 });
    const acceptReceipt = await acceptTx.wait();
    console.log("Bet accepted successfully, tx hash:", acceptReceipt.hash);
    
    // Hole Wettdetails nach der Akzeptanz
    const betDetailsAfter = await noLossBet.bets(betId);
    console.log("Bet Details after acceptance:", {
      creator: betDetailsAfter.creator,
      opponent: betDetailsAfter.opponent,
      creatorStake: ethers.formatEther(betDetailsAfter.creatorStake),
      opponentStake: ethers.formatEther(betDetailsAfter.opponentStake),
      condition: betDetailsAfter.condition,
      resolved: betDetailsAfter.resolved,
      expiration: new Date(Number(betDetailsAfter.expiration) * 1000).toLocaleString()
    });

    // Prüfe CELO-Balances vor der Auflösung
    const creatorBalanceBefore = await mockCELO.balanceOf(await deployer.getAddress());
    const opponentBalanceBefore = await mockCELO.balanceOf(await opponent.getAddress());
    const contractBalanceBefore = await mockCELO.balanceOf(addresses.noLossBet);
    console.log("Creator CELO Balance before resolution:", ethers.formatEther(creatorBalanceBefore));
    console.log("Opponent CELO Balance before resolution:", ethers.formatEther(opponentBalanceBefore));
    console.log("Contract CELO Balance before resolution:", ethers.formatEther(contractBalanceBefore));

    // Prüfe auch die cUSD-Balances
    const contractCUSDBalanceBefore = await mockCUSD.balanceOf(addresses.noLossBet);
    console.log("Contract cUSD Balance before resolution:", ethers.formatEther(contractCUSDBalanceBefore));

    // Creator reicht Ergebnis ein (true = Creator gewinnt)
    console.log("Creator submitting outcome (true)...");
    const creatorSubmitTx = await noLossBet.submitOutcome(betId, true, { gasLimit: 1000000 });
    await creatorSubmitTx.wait();
    console.log("Creator outcome submitted");

    // Opponent reicht das gleiche Ergebnis ein
    console.log("Opponent submitting outcome (true)...");
    const opponentSubmitTx = await noLossBet.connect(opponent).submitOutcome(betId, true, { gasLimit: 1000000 });
    await opponentSubmitTx.wait();
    console.log("Opponent outcome submitted");

    // Löse die Wette auf
    console.log("Resolving bet...");
    const resolveTx = await noLossBet.resolveBet(betId, { gasLimit: 1000000 });
    const resolveReceipt = await resolveTx.wait();
    console.log("Bet resolved successfully, tx hash:", resolveReceipt.hash);

    // Prüfe CELO-Balances nach der Auflösung
    const creatorBalanceAfter = await mockCELO.balanceOf(await deployer.getAddress());
    const opponentBalanceAfter = await mockCELO.balanceOf(await opponent.getAddress());
    const contractBalanceAfter = await mockCELO.balanceOf(addresses.noLossBet);
    console.log("Creator CELO Balance after resolution:", ethers.formatEther(creatorBalanceAfter));
    console.log("Opponent CELO Balance after resolution:", ethers.formatEther(opponentBalanceAfter));
    console.log("Contract CELO Balance after resolution:", ethers.formatEther(contractBalanceAfter));
    
    // Prüfe auch die cUSD-Balances
    const contractCUSDBalanceAfter = await mockCUSD.balanceOf(addresses.noLossBet);
    console.log("Contract cUSD Balance after resolution:", ethers.formatEther(contractCUSDBalanceAfter));
    
    // Berechne Gewinn/Verlust
    const creatorProfit = BigInt(creatorBalanceAfter) - BigInt(creatorBalanceBefore);
    const opponentProfit = BigInt(opponentBalanceAfter) - BigInt(opponentBalanceBefore);
    console.log("Creator profit/loss:", ethers.formatEther(creatorProfit));
    console.log("Opponent profit/loss:", ethers.formatEther(opponentProfit));

    // Hole Wettdetails nach der Auflösung
    const betDetailsResolved = await noLossBet.bets(betId);
    console.log("Bet Details after resolution:", {
      creator: betDetailsResolved.creator,
      opponent: betDetailsResolved.opponent,
      creatorStake: ethers.formatEther(betDetailsResolved.creatorStake),
      opponentStake: ethers.formatEther(betDetailsResolved.opponentStake),
      condition: betDetailsResolved.condition,
      resolved: betDetailsResolved.resolved,
      expiration: new Date(Number(betDetailsResolved.expiration) * 1000).toLocaleString()
    });

    console.log("Contract interactions test complete!");
  } catch (error) {
    console.error("Error during interaction test:", error);
    console.error("Error details:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 