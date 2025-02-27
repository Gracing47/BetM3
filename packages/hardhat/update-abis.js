const path = require('path');
const { execSync } = require('child_process');

console.log('Running ABI and contract address update...');

try {
  const scriptPath = path.resolve(__dirname, 'scripts', 'update-abis-and-addresses.js');
  execSync(`node ${scriptPath}`, { stdio: 'inherit' });
  console.log('Update completed successfully!');
} catch (error) {
  console.error('Update failed:', error);
  process.exit(1);
} 