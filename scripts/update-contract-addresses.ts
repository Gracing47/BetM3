import * as fs from 'fs';
import * as path from 'path';

// Function to update the contract addresses in the config file
export function updateContractAddresses(addresses: {
  noLossBet: string;
  mockCELO: string;
  cUSDToken: string;
  betM3Token: string;
  uniswapPoolMock: string;
  lpToken: string;
}) {
  // Path to the config file
  const configFilePath = path.resolve(__dirname, '../../react-app/config/contracts.ts');
  
  // Generate the file content
  const fileContent = `/**
 * This file is automatically updated after every deployment.
 * Last updated: ${new Date().toISOString()}
 */
export const CONTRACT_ADDRESSES = {
  noLossBet: "${addresses.noLossBet}",
  mockCELO: "${addresses.mockCELO}",
  cUSDToken: "${addresses.cUSDToken}",
  betM3Token: "${addresses.betM3Token}",
  uniswapPoolMock: "${addresses.uniswapPoolMock}",
  lpToken: "${addresses.lpToken}",
};
`;
  
  // Write the file
  fs.writeFileSync(configFilePath, fileContent);
  
  console.log(`Updated contract addresses in ${configFilePath}`);
}

// If this script is run directly
if (require.main === module) {
  // Read the addresses from the command line arguments
  const addresses = {
    noLossBet: process.argv[2] || '',
    mockCELO: process.argv[3] || '',
    cUSDToken: process.argv[4] || '',
    betM3Token: process.argv[5] || '',
    uniswapPoolMock: process.argv[6] || '',
    lpToken: process.argv[7] || '',
  };
  
  // Check if all addresses are provided
  const missingAddresses = Object.entries(addresses)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missingAddresses.length > 0) {
    console.error(`Error: Missing addresses for ${missingAddresses.join(', ')}`);
    console.error('Usage: npx ts-node update-contract-addresses.ts <noLossBet> <mockCELO> <cUSDToken> <betM3Token> <uniswapPoolMock> <lpToken>');
    process.exit(1);
  }
  
  // Update the addresses
  updateContractAddresses(addresses);
} 