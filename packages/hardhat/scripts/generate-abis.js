const fs = require('fs');
const path = require('path');

// Paths
const artifactsDir = path.join(__dirname, '../../../artifacts/packages/hardhat/contracts');
const outputDir = path.join(__dirname, '../../react-app/abis/generated');

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

console.log('ABI generation complete!'); 