# AcceptBet Function Usage Documentation

## Overview

The `acceptBet` function is a critical component of the NoLossBet application, allowing users to accept bets created by other users. This document outlines how the function is currently implemented and used throughout the application.

## Smart Contract Implementation

In the `NoLossBet.sol` contract, the `acceptBet` function is defined with the following signature:

```solidity
function acceptBet(uint256 _betId, bool _prediction, uint256 _customStake) external {
    Bet storage bet = bets[_betId];
    require(bet.opponent == address(0), "Bet already accepted");
    require(msg.sender != bet.creator, "Creator cannot accept own bet");
    require(block.timestamp < bet.expiration, "Bet has expired");

    uint256 stakeAmount = _customStake > 0 ? _customStake : bet.opponentStake;
    require(stakeAmount >= 10 * 10 ** 18, "Opponent stake must be at least 10 CELO");
    require(celoToken.transferFrom(msg.sender, address(this), stakeAmount), "Stake transfer failed");

    // Additional implementation details...
}
```

The function takes three parameters:
- `_betId` (uint256): The ID of the bet to accept
- `_prediction` (bool): The prediction of the bet outcome (true/false)
- `_customStake` (uint256): Optional custom stake amount (if 0, uses the default opponent stake)

## Contract Deployment

The NoLossBet contract is deployed at the following addresses:

- **Local Development**: `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c`
- **Alfajores Testnet**: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`

The frontend is currently configured to use the local development address:

```javascript
// packages/react-app/config/contracts.ts
export const CONTRACT_ADDRESSES = {
  "noLossBet": "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
  "mockCELO": "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
  "cUSDToken": "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  "lpToken": "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  "uniswapPoolMock": "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
  "betM3Token": "0x9A676e781A523b5d0C0e43731313A708CB607508"
};
```

## ABI Definition

The ABI definition in `NoLossBetABI.ts` includes the following signature for `acceptBet`:

```javascript
{
  "inputs": [
    {
      "internalType": "uint256",
      "name": "_betId",
      "type": "uint256"
    },
    {
      "internalType": "bool",
      "name": "_prediction",
      "type": "bool"
    },
    {
      "internalType": "uint256",
      "name": "_customStake",
      "type": "uint256"
    }
  ],
  "name": "acceptBet",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}
```

This matches the implementation in the smart contract.

## Frontend Implementation

### In `useWeb3.tsx` Context

The frontend implementation in `useWeb3.tsx` provides a wrapper around the smart contract function:

```javascript
const acceptBet = useCallback(async (
  betId: string, 
  prediction: boolean, 
  customStake?: string
): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error("Cannot accept bet in server-side environment");
  }

  if (!signer) throw new Error("Wallet not connected");
  if (!address) throw new Error("Wallet address is not available");

  console.log(`Accepting bet: betId=${betId}, prediction=${prediction}, customStake=${customStake || 'default'}`);

  try {
    // Get contract instances
    const { mockCELO } = await getContracts();
    
    // Get NoLossBet contract with signer
    const noLossBetAddress = getNoLossBetAddress();
    const contract = new ethers.Contract(
      noLossBetAddress,
      NoLossBetABI,
      signer
    );
    
    // Convert betId to number
    const betIdNumber = parseInt(betId);
    
    // Get bet details to determine stake
    const betDetails = await contract.bets(betIdNumber);
    console.log("Bet details:", betDetails);
    
    // Determine stake amount - always ensure minimum 10 CELO
    let stakeAmount: bigint;
    if (customStake) {
      stakeAmount = ethers.parseEther(customStake);
    } else {
      stakeAmount = betDetails.opponentStake;
    }
    
    // Ensure minimum stake of 10 CELO
    const MIN_STAKE = ethers.parseEther("10");
    if (stakeAmount < MIN_STAKE) {
      console.log(`Stake amount ${ethers.formatEther(stakeAmount)} is below minimum. Using 10 CELO instead.`);
      stakeAmount = MIN_STAKE;
    }
    
    console.log(`Required stake: ${ethers.formatEther(stakeAmount)} (${stakeAmount.toString()})`);
    
    // Approve tokens for the transaction
    console.log(`Approving tokens for bet acceptance: ${ethers.formatEther(stakeAmount)}`);
    const approveTx = await mockCELO.approve(
      noLossBetAddress,
      stakeAmount,
      { gasLimit: 300000 }
    );
    
    console.log(`Waiting for approval transaction: ${approveTx.hash}`);
    await approveTx.wait();
    console.log(`Approval confirmed`);
    
    // Add a short delay to ensure the blockchain has processed the approval
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Call the acceptBet function with 3 parameters
    console.log(`Calling acceptBet with 3 parameters: ${betIdNumber}, ${prediction}, ${stakeAmount.toString()}`);
    const tx = await contract.acceptBet(
      betIdNumber, 
      prediction, 
      stakeAmount,
      {
        gasLimit: 500000,
        gasPrice: ethers.parseUnits("50", "gwei")
      }
    );
    
    console.log(`Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    return {
      success: true,
      transaction: tx,
      betId: betIdNumber
    };
  } catch (error: any) {
    console.error("Error accepting bet:", error);
    throw new Error(`Failed to accept bet: ${error.message}`);
  }
}, [getNoLossBetAddress, signer, address, getContracts]);
```

Key aspects of the implementation:
1. It accepts three parameters: `betId`, `prediction`, and an optional `customStake`
2. It performs validation checks for the environment and wallet connection
3. It retrieves the bet details to determine the stake amount
4. It ensures a minimum stake of 10 CELO
5. It approves the token transfer before calling the contract function
6. It uses a higher gas price (50 gwei) to help ensure transaction success
7. It includes detailed logging for debugging purposes

### In UI Components

#### JoinBetModal Component

The `JoinBetModal.tsx` component provides the user interface for accepting bets:

```javascript
const JoinBetModal: React.FC<JoinBetModalProps> = ({ bet, onClose, onJoin, isLoading }) => {
  // State variables and other component logic...

  const handleJoinBet = async () => {
    if (selectedPrediction === null) {
      setError("Please select a prediction (Yes or No)");
      return;
    }
    
    setError(null);
    setIsJoining(true);
    
    try {
      // Get stake amount based on selection
      let finalStake;
      if (stakeOption === 'custom' && customStake) {
        finalStake = customStake;
      } else if (stakeOption === '10') {
        finalStake = '10';
      } else if (stakeOption === '100') {
        finalStake = '100';
      }
      
      console.log("Joining bet with:", {
        prediction: selectedPrediction,
        stake: finalStake || "default"
      });
      
      // Call onJoin with only prediction and stake
      await onJoin(selectedPrediction, finalStake);
    } catch (err: any) {
      // Error handling...
    } finally {
      setIsJoining(false);
    }
  };

  // Component rendering...
};
```

#### ActiveBets Component

The `ActiveBets.tsx` component handles the integration between the UI and the context:

```javascript
const handleJoinBet = async (betId: string, prediction: boolean, customStake?: string) => {
  console.log("Joining bet:", { betId, prediction, customStake });
  setJoinError(null);
  try {
    // Pass parameters to acceptBet
    let tx;
    if (customStake) {
      // If custom stake is provided
      console.log("Using custom stake");
      tx = await acceptBet(betId, prediction, customStake);
    } else {
      // Use default stake
      console.log("Using 2-parameter version with default stake");
      tx = await acceptBet(betId, prediction);
    }
    
    await tx.wait();
    await refreshBets();
    setSelectedBet(null);
  } catch (error: any) {
    console.error("Error joining bet:", error);
    setJoinError(error.message || "Failed to join bet");
  }
};
```

## Current Error Analysis

The application is experiencing an "Internal JSON-RPC error" when attempting to call the `acceptBet` function. The error message is:

```
MetaMask - RPC Error: Internal JSON-RPC error. 
{code: -32603, message: 'Internal JSON-RPC error.', stack: '{\n  "code": -32603,\n  "message": "Internal JSON-RP…hfbeogaeaoehlefnkodbefgpgknn/common-1.js:1:157805'}
```

The error occurs when the transaction is sent to the blockchain. The transaction data being sent is:

```
"data": "0xc93f0023000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000008ac7230489e80000"
```

This data represents the encoded function call to `acceptBet` with the following parameters:
- `_betId`: 0
- `_prediction`: true
- `_customStake`: 10000000000000000000 (10 CELO in wei)

The function selector `0xc93f0023` corresponds to the `acceptBet(uint256,bool,uint256)` function signature, which matches the implementation in the smart contract.

## Possible Causes of the Error

The "Internal JSON-RPC error" typically indicates that the transaction was rejected by the blockchain node due to a contract execution error. This could be caused by:

1. **Contract Requirements Not Met**:
   - The bet may already have an opponent (`bet.opponent != address(0)`)
   - The caller may be the creator of the bet (`msg.sender == bet.creator`)
   - The bet may have expired (`block.timestamp >= bet.expiration`)
   - The stake amount may be less than the required minimum (`stakeAmount < 10 * 10 ** 18`)

2. **Token Transfer Issues**:
   - The user may not have enough CELO tokens (`celoToken.balanceOf(msg.sender) < stakeAmount`)
   - The user may not have approved enough tokens for transfer (`celoToken.allowance(msg.sender, address(this)) < stakeAmount`)

3. **Stable Token Transfer Issues**:
   - The owner may not have enough stable tokens (`stableToken.balanceOf(owner()) < halfStake`)
   - The owner may not have approved enough stable tokens for transfer (`stableToken.allowance(owner(), address(this)) < halfStake`)

4. **Liquidity Pool Issues**:
   - The Uniswap router may not be able to add liquidity due to slippage or other constraints

5. **Contract Deployment Mismatch**:
   - The frontend might be using a different contract address than the one deployed
   - The ABI might not match the deployed contract implementation

## Debugging Steps

To identify the exact cause of the error, the following debugging steps can be taken:

1. **Check Bet Status**:
   - Retrieve the bet details using `contract.bets(betId)` and verify that it can be accepted
   - Ensure the bet has not expired and does not already have an opponent

2. **Check Token Balances and Allowances**:
   - Verify that the user has enough CELO tokens (`celoToken.balanceOf(address)`)
   - Verify that the user has approved enough tokens for transfer (`celoToken.allowance(address, noLossBetAddress)`)
   - Verify that the owner has enough stable tokens (`stableToken.balanceOf(owner)`)

3. **Simplify the Transaction**:
   - Try with a smaller stake amount to rule out balance issues
   - Ensure the gas limit is sufficient for the transaction

4. **Add More Detailed Error Handling**:
   - Modify the contract to provide more specific error messages
   - Add try-catch blocks around specific operations to identify where the failure occurs

5. **Verify Contract Deployment**:
   - Ensure that the frontend is using the correct contract address
   - Verify that the ABI matches the deployed contract implementation

## Recommendations

1. **Improve Error Handling**:
   - Add more detailed error messages in the smart contract
   - Implement better error handling in the frontend to provide clearer feedback to users

2. **Enhance Validation**:
   - Add pre-transaction validation to check if the bet can be accepted
   - Verify token balances and allowances before attempting to accept the bet

3. **Optimize Gas Usage**:
   - Review the contract for potential gas optimizations
   - Consider using a more efficient approach for liquidity management

4. **Update Documentation**:
   - Ensure that the documentation accurately reflects the current implementation
   - Provide clear guidelines for users on how to accept bets

5. **Verify Contract Deployment**:
   - Ensure that the frontend is using the correct contract address
   - Consider redeploying the contract if there are issues with the current deployment

By addressing these issues, the application should be able to successfully call the `acceptBet` function without encountering the "Internal JSON-RPC error". 