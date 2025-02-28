const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const hardhatDir = path.resolve(__dirname, '..');
const reactAppDir = path.resolve(hardhatDir, '..', 'react-app');
const artifactsDir = path.join(hardhatDir, 'artifacts', 'contracts');
const outputDir = path.join(reactAppDir, 'abis', 'generated');
const contractsConfigPath = path.join(reactAppDir, 'config', 'contracts.ts');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Contracts to generate ABIs for
const contracts = [
  'NoLossBet.sol/NoLossBet.json',
  'MockCELO.sol/MockCELO.json',
  'BetM3Token.sol/BetM3Token.json',
  'UniswapPoolMock.sol/UniswapPoolMock.json',
  'cUSDToken.sol/cUSDToken.json',
  'LPToken.sol/LPToken.json'
];

// Read deployment info
function updateContractAddresses() {
  try {
    console.log('Updating contract addresses...');
    
    // Read the deployment file
    const deploymentPath = path.join(hardhatDir, 'deployment-localhost.json');
    if (!fs.existsSync(deploymentPath)) {
      console.error(`Deployment file not found at: ${deploymentPath}`);
      return false;
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const addresses = deployment.addresses;
    
    // Create contracts.ts content
    const contractsContent = `/**
 * This file is automatically updated after every deployment.
 * DO NOT EDIT MANUALLY.
 */
export const CONTRACT_ADDRESSES = ${JSON.stringify(addresses, null, 2)};
`;
    
    // Write to contracts.ts
    fs.writeFileSync(contractsConfigPath, contractsContent);
    console.log(`Updated contract addresses in: ${contractsConfigPath}`);
    return true;
  } catch (error) {
    console.error('Error updating contract addresses:', error);
    return false;
  }
}

// Generate ABIs
function generateABIs() {
  try {
    console.log('Generating ABIs...');
    
    // Generate index.ts file content
    let indexFileContent = '';
    
    // Process each contract
    contracts.forEach(contractPath => {
      try {
        const contractName = path.basename(contractPath, '.json');
        const abiFileName = `${contractName}ABI.ts`;
        
        console.log(`Processing ${contractName}...`);
        
        // Read the contract artifact
        const artifactPath = path.join(artifactsDir, contractPath);
        if (!fs.existsSync(artifactPath)) {
          console.error(`Artifact not found at: ${artifactPath}`);
          return;
        }
        
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Extract the ABI
        const abi = artifact.abi;
        
        // Create the TypeScript file content
        const fileContent = `export const ${contractName}ABI = ${JSON.stringify(abi, null, 2)};\n`;
        
        // Write to file
        fs.writeFileSync(path.join(outputDir, abiFileName), fileContent);
        console.log(`Generated ${abiFileName}`);
        
        // Add to index.ts
        indexFileContent += `export * from './${abiFileName}';\n`;
      } catch (error) {
        console.error(`Error processing ${contractPath}:`, error);
      }
    });
    
    // Write index.ts
    fs.writeFileSync(path.join(outputDir, 'index.ts'), indexFileContent);
    console.log('Generated index.ts');
    
    return true;
  } catch (error) {
    console.error('Error generating ABIs:', error);
    return false;
  }
}

// Main function
function main() {
  console.log('Starting update process...');
  
  const addressesUpdated = updateContractAddresses();
  const abisGenerated = generateABIs();
  
  if (addressesUpdated && abisGenerated) {
    console.log('Successfully updated contract addresses and ABIs!');
    return 0;
  } else {
    console.error('Failed to update contract addresses and/or ABIs.');
    return 1;
  }
}

// Run the main function
const exitCode = main();
process.exit(exitCode); 