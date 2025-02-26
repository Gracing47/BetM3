# NoLossBet - Decentralized Betting Platform on Celo

NoLossBet is a decentralized betting platform built on the Celo blockchain that allows users to create and participate in bets without losing their principal stake. The platform uses yield farming strategies to generate returns on staked tokens, creating a risk-free betting experience where users can only win.

## Features

### Smart Contract Features

- **No-Loss Betting**: Users' principal stakes are preserved through yield farming
- **Customizable Stakes**: Create bets with custom stake amounts (minimum 100 CELO for creators)
- **Flexible Joining**: Join bets with custom stake amounts (minimum 10 CELO for opponents)
- **Comment System**: Add comments when joining bets to express your thoughts
- **Yield Distribution**: Winners receive a larger portion of the yield generated
- **NFT Representation**: Each bet is represented as an NFT that transfers to the opponent when accepted
- **Dispute Resolution**: Built-in mechanism for resolving disputed outcomes
- **Reward Tokens**: BetM3 tokens are distributed as additional rewards to participants

### Frontend Features

- **Modern UI**: Clean, responsive interface built with React
- **Wallet Integration**: Seamless connection with MetaMask and other Ethereum wallets
- **Bet Creation**: Intuitive form for creating new bets
- **Bet Discovery**: Browse and filter active bets
- **Bet Management**: Track and manage your active and past bets
- **Yield Visualization**: See potential and actual yields on your bets

## Architecture

The project consists of several key components:

### Smart Contracts

1. **NoLossBet.sol**: The main contract that handles bet creation, acceptance, and resolution
2. **MockCELO.sol**: A mock CELO token for testing purposes
3. **cUSDToken.sol**: A mock cUSD stablecoin for testing purposes
4. **LPToken.sol**: Represents liquidity pool tokens
5. **UniswapPoolMock.sol**: Simulates Uniswap liquidity pool for yield generation
6. **BetM3Token.sol**: Reward token distributed to bet participants

### Frontend

- React application with Tailwind CSS for styling
- ethers.js for blockchain interaction
- Context API for state management

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MetaMask or another Ethereum wallet

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/bet-m-3.git
   cd bet-m-3
   ```

2. Install dependencies:
   ```
   # Install Hardhat dependencies
   cd packages/hardhat
   npm install

   # Install React app dependencies
   cd ../react-app
   npm install
   ```

### Local Development

1. Start a local Hardhat node:
   ```
   cd packages/hardhat
   npx hardhat node
   ```

2. Deploy the contracts to the local network:
   ```
   # In a new terminal
   cd packages/hardhat
   npx hardhat run scripts/deploy-localhost.ts --network localhost
   ```

3. Start the React app:
   ```
   cd packages/react-app
   npm run dev
   ```

4. Connect MetaMask to the local Hardhat network:
   - Network Name: Hardhat
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

## Bet Flow

### Creating a Bet

1. Connect your wallet
2. Navigate to the "Create Bet" page
3. Enter your stake amount (minimum 100 CELO)
4. Specify the opponent's stake amount
5. Describe the bet condition
6. Select your prediction (Yes/No)
7. Submit the transaction

### Joining a Bet

1. Browse available bets
2. Click "Join" on a bet you're interested in
3. View the bet details, including the bet ID
4. Enter your stake amount (minimum 10 CELO, or the amount specified by the creator)
5. Select your prediction (Yes/No)
6. Optionally add a comment
7. Confirm and submit the transaction

### Resolving a Bet

1. Once the outcome is known, both parties submit the outcome
2. If both agree, the bet is automatically resolved
3. If there's a disagreement, the dispute resolution mechanism is triggered
4. Upon resolution, stakes are returned to both parties along with yield distribution

## Deployment

The project includes an automated deployment script that:

1. Deploys all necessary contracts
2. Mints initial tokens for testing
3. Updates deployment information in all relevant locations
4. Ensures consistent contract addresses across the application

To deploy to a new network:

```
cd packages/hardhat
npx hardhat run scripts/deploy-localhost.ts --network <network-name>
```

## Testing

Run the test suite to verify contract functionality:

```
cd packages/hardhat
npx hardhat test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Celo Foundation for blockchain infrastructure
- OpenZeppelin for secure contract libraries
- Uniswap for liquidity pool inspiration
