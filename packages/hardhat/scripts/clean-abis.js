const fs = require('fs');
const path = require('path');

/**
 * Dieses Skript bereinigt den ABI-Ordner und entfernt alte Verträge, 
 * die nicht mehr Teil des aktuellen No-Loss-Betting-Systems sind.
 */
function main() {
  console.log('Cleaning up old ABIs...');
  
  // Pfad zum generatedABI-Ordner
  const reactAppDir = path.resolve(__dirname, '..', '..', 'react-app');
  const abiDir = path.join(reactAppDir, 'abis', 'generated');
  
  // Prüfen ob der Ordner existiert
  if (!fs.existsSync(abiDir)) {
    console.log('ABI directory does not exist yet, no cleanup needed.');
    return 0;
  }
  
  // Liste der veralteten ABI-Dateien
  const outdatedABIs = [
    'NoLossBetABI.ts',
    'MockCELOABI.ts',
    'BetM3TokenABI.ts', 
    'UniswapPoolMockABI.ts',
    'LPTokenABI.ts'
  ];
  
  // Dateien löschen
  let deletedCount = 0;
  outdatedABIs.forEach(filename => {
    const filePath = path.join(abiDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${filePath}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${filePath}:`, error);
      }
    }
  });
  
  // Index-Datei löschen, falls vorhanden (wird bei der nächsten ABI-Generierung neu erstellt)
  const indexPath = path.join(abiDir, 'index.ts');
  if (fs.existsSync(indexPath)) {
    try {
      fs.unlinkSync(indexPath);
      console.log(`Deleted index file: ${indexPath}`);
    } catch (error) {
      console.error(`Error deleting index file:`, error);
    }
  }
  
  console.log(`Cleanup complete! Deleted ${deletedCount} outdated ABI files.`);
  return 0;
}

// Skript ausführen
const exitCode = main();
process.exit(exitCode); 