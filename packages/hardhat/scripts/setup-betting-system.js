const { execSync } = require('child_process');
const path = require('path');

/**
 * Dieses Skript führt alle notwendigen Schritte zur Einrichtung 
 * und zum Testen des No-Loss-Betting-Systems aus.
 */
function main() {
  console.log('Starting No-Loss Betting System setup...');
  console.log('=======================================\n');
  
  try {
    // Schritt 1: Alte ABI-Dateien bereinigen
    console.log('STEP 1: Cleaning up old ABIs...');
    execSync('node scripts/clean-abis.js', { stdio: 'inherit' });
    console.log('ABI cleanup completed.\n');
    
    // Schritt 2: Contracts kompilieren
    console.log('STEP 2: Compiling contracts...');
    execSync('npx hardhat compile', { stdio: 'inherit' });
    console.log('Compilation completed.\n');
    
    // Schritt 3: Lokales Deployment durchführen
    console.log('STEP 3: Deploying contracts to local node...');
    execSync('npx hardhat run scripts/deploy-local-test.ts --network localhost', { stdio: 'inherit' });
    console.log('Deployment completed.\n');
    
    // Schritt 4: ABIs aktualisieren
    console.log('STEP 4: Updating ABIs and addresses...');
    execSync('node scripts/update-abis-and-addresses.js', { stdio: 'inherit' });
    console.log('ABI update completed.\n');
    
    // Schritt 5: Simulation ausführen
    console.log('STEP 5: Running betting simulation...');
    execSync('npx hardhat run scripts/simulate-betting.ts --network localhost', { stdio: 'inherit' });
    console.log('Simulation completed.\n');
    
    console.log('=======================================');
    console.log('No-Loss Betting System setup completed successfully!');
    console.log('You can now:');
    console.log('1. Run tests: npx hardhat test');
    console.log('2. Start your frontend app with the new contracts');
    
    return 0;
  } catch (error) {
    console.error('Setup failed with error:');
    console.error(error);
    return 1;
  }
}

// Run the script
const exitCode = main();
process.exit(exitCode); 