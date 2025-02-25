# Deployment Scripts

This directory contains scripts for deploying the NoLossBet smart contracts to a local development environment.

## Localhost Deployment Script

- **deploy-localhost.ts**: Deploy all contracts to a local Hardhat network for development and testing.
  ```
  npx hardhat run scripts/deploy-localhost.ts --network localhost
  ```
  
  This script will:
  1. Deploy the BetM3Token contract
  2. Deploy the AavePoolMock contract
  3. Deploy the NoLossBet contract with the addresses of the other contracts
  4. Save the deployment information to `deployment-localhost.json`

## Running a Local Hardhat Node

Before deploying, you need to start a local Hardhat node:

```
npx hardhat node
```

Then, in a separate terminal, run the deployment script:

```
npx hardhat run scripts/deploy-localhost.ts --network localhost
```

## Notes

- The deployment script includes error handling and detailed logging.
- All contracts are deployed with the same account.
- For testnet deployments (Alfajores, Sepolia, etc.), see the scripts in the `archive` directory.

## Archive

The `archive` directory contains scripts for deploying to testnets and other utility scripts that are kept for reference but are not actively used for local development. 