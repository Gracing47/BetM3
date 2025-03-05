import * as fs from 'fs';
import * as path from 'path';

// This script generates documentation for the NoLossBetMulti system
async function main() {
  try {
    console.log("Generating documentation for the No-Loss Betting System...");
    
    const docsDir = path.resolve(process.cwd(), '..', '..', 'docs');
    
    // Create docs directory if it doesn't exist
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    // Generate overview documentation
    const overviewPath = path.resolve(docsDir, 'OVERVIEW.md');
    const overviewContent = `# No-Loss Betting System Overview

## Introduction

The No-Loss Betting System is a decentralized betting platform built on the Celo blockchain. 
It allows participants to place stakes on binary outcomes (true/false) without the risk of losing their principal.

## Key Components

1. **NoLossBetMulti Contract**: The core smart contract that manages individual bets
2. **BettingManagerFactory Contract**: Factory contract for deploying NoLossBetMulti instances
3. **cUSDToken Contract**: Token implementation used for staking in the system

## How It Works

1. A bet creator initiates a new bet with:
   - A condition/question (e.g., "Will Celo reach $10 by the end of the month?")
   - An initial stake (must be >= minimum stake)
   - A prediction (true/false)
   - A duration for the betting period

2. Other participants can join the bet by placing stakes on either side (true/false).

3. After the betting period expires, a 24-hour resolution phase begins:
   - Participants vote on the outcome (weighted by their stake)
   - Participants must vote for the side they joined

4. Resolution mechanism:
   - If one outcome has ≥80% of the total stake, the bet auto-resolves
   - Otherwise, the contract owner can manually resolve or cancel the bet

5. Payouts follow a "no-loss" principle:
   - All participants receive back their original stake
   - A simulated yield (e.g., 5%) is distributed with 80% going to winners and 20% to losers

## Benefits

- **No Capital Loss**: Participants always receive back their original stake
- **Yield Generation**: Winners earn additional returns from the simulated yield
- **Decentralized Resolution**: Bets can be auto-resolved through participant consensus
- **Customizable**: Easily deployed with different tokens and parameters

## Use Cases

- Prediction markets for crypto price movements
- Sports betting with principal protection
- Event outcome wagering
- Community governance decisions with economic incentives
`;

    fs.writeFileSync(overviewPath, overviewContent);
    console.log(`Generated overview documentation at: ${overviewPath}`);
    
    // Generate technical API documentation
    const apiPath = path.resolve(docsDir, 'API_REFERENCE.md');
    const apiContent = `# No-Loss Betting System API Reference

## Core Contracts

### NoLossBetMulti

The main betting contract that handles bet creation, participation, and resolution.

#### Key Functions

\`\`\`solidity
// Create a new bet
function createBet(
    uint256 _stake,
    string calldata _condition,
    uint256 _durationDays,
    bool _creatorPrediction
) external;

// Join an existing bet
function joinBet(
    uint256 _betId,
    uint256 _stake,
    bool _prediction
) external;

// Submit a resolution vote after expiration
function submitResolutionOutcome(uint256 _betId, bool _outcome) external;

// Try to automatically finalize a bet after resolution period
function finalizeResolution(uint256 _betId) external nonReentrant;

// Admin function to finalize resolution manually
function adminFinalizeResolution(uint256 _betId, bool _winningOutcome, bool _cancel) external onlyOwner nonReentrant;

// Get participant's stake in a bet
function getParticipantStake(uint256 _betId, address _participant) public view returns (uint256);

// Get bet details
function getBetDetails(uint256 _betId)
    external
    view
    returns (
        address creator,
        string memory condition,
        uint256 expiration,
        bool resolved,
        uint256 totalStakeTrue,
        uint256 totalStakeFalse,
        bool resolutionFinalized,
        bool winningOutcome
    );

// Set the yield rate (admin only)
function setYieldRate(uint256 _yieldRate) external onlyOwner;
\`\`\`

#### Key Events

\`\`\`solidity
event BetCreated(
    uint256 indexed betId,
    address indexed creator,
    string condition,
    uint256 expiration,
    bool creatorPrediction,
    uint256 creatorStake
);

event BetJoined(
    uint256 indexed betId,
    address indexed participant,
    bool prediction,
    uint256 stake
);

event ResolutionVoteSubmitted(
    uint256 indexed betId,
    address indexed participant,
    bool outcome,
    uint256 voteWeight
);

event BetResolved(
    uint256 indexed betId,
    bool winningOutcome,
    uint256 simulatedYield
);

event BetResolutionCancelled(uint256 indexed betId);
\`\`\`

### BettingManagerFactory

Factory contract for creating and managing NoLossBetMulti instances.

#### Key Functions

\`\`\`solidity
// Create a new betting contract instance
function createBettingContract(address _token) external returns (address);

// Get the total number of deployed betting contracts
function getBettingContractsCount() external view returns (uint256);

// Get a betting contract by index
function getBettingContract(uint256 index) external view returns (address);
\`\`\`

#### Key Events

\`\`\`solidity
event BettingContractCreated(address indexed bettingContract, address indexed creator);
\`\`\`

## Testing & Deployment

### Scripts

1. **deploy-betting-system.ts**: Deploys the entire betting system
2. **simulate-betting.ts**: Simulates a complete betting lifecycle
3. **update-betting-config.ts**: Updates configuration parameters
4. **generate-docs.ts**: Generates this documentation

### Tests

- **NoLossBetMulti.test.ts**: Comprehensive tests for the main betting contract
- **BettingManagerFactory.test.ts**: Tests for the factory contract
`;

    fs.writeFileSync(apiPath, apiContent);
    console.log(`Generated API reference documentation at: ${apiPath}`);
    
    // Generate step-by-step guide
    const guidePath = path.resolve(docsDir, 'USAGE_GUIDE.md');
    const guideContent = `# No-Loss Betting System Usage Guide

## Deployment

1. **Deploy the system**:
   \`\`\`bash
   npx hardhat run scripts/deploy-betting-system.ts --network <network_name>
   \`\`\`

   This will deploy:
   - cUSDToken contract
   - BettingManagerFactory contract
   - An initial NoLossBetMulti instance

2. **Simulate betting operations** (for testing):
   \`\`\`bash
   npx hardhat run scripts/simulate-betting.ts --network <network_name>
   \`\`\`

## Creating a Bet

1. Connect to a deployed NoLossBetMulti contract instance
2. Approve token spending: \`token.approve(bettingContractAddress, amount)\`
3. Create a bet:
   \`\`\`javascript
   await bettingContract.createBet(
     ethers.parseEther("100"),         // 100 token stake
     "Will Celo reach $10 by June?",   // Bet condition
     7,                                // 7 days duration
     true                              // Creator predicts TRUE
   );
   \`\`\`

## Joining a Bet

1. Connect to the NoLossBetMulti contract instance
2. Approve token spending: \`token.approve(bettingContractAddress, amount)\`
3. Join the bet with desired prediction:
   \`\`\`javascript
   await bettingContract.joinBet(
     0,                        // Bet ID (0 for first bet)
     ethers.parseEther("50"),  // 50 token stake
     false                     // Joining with FALSE prediction
   );
   \`\`\`

## Resolution Phase

1. After bet expiration, submit a resolution vote:
   \`\`\`javascript
   await bettingContract.submitResolutionOutcome(0, true); // Vote TRUE for bet ID 0
   \`\`\`

2. After the 24-hour resolution period, finalize the bet:
   \`\`\`javascript
   // Anyone can call this if there's an 80% majority
   await bettingContract.finalizeResolution(0);
   
   // If no supermajority, owner can force an outcome or cancel
   await bettingContract.adminFinalizeResolution(0, true, false); // TRUE wins
   // OR
   await bettingContract.adminFinalizeResolution(0, false, true); // Cancel bet
   \`\`\`

## Running Tests

Run the comprehensive test suite:

\`\`\`bash
npx hardhat test
\`\`\`

## Advanced Configuration

Update the yield rate:

\`\`\`bash
npx hardhat run scripts/update-betting-config.ts --network <network_name>
\`\`\`

## Deploying Custom Instances

Use the factory to create additional betting contract instances:

\`\`\`javascript
// Get the factory contract
const factory = await ethers.getContractAt("BettingManagerFactory", factoryAddress);

// Create a new betting contract instance with a specific token
const createTx = await factory.createBettingContract(tokenAddress);
await createTx.wait();

// Get the address of the newly created instance
const contractCount = await factory.getBettingContractsCount();
const newInstanceAddress = await factory.getBettingContract(contractCount - 1);
\`\`\`
`;

    fs.writeFileSync(guidePath, guideContent);
    console.log(`Generated usage guide at: ${guidePath}`);
    
    console.log("Documentation generation completed successfully!");
    
  } catch (error) {
    console.error("Documentation generation failed!");
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