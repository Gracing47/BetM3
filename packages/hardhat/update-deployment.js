const fs = require('fs');
const path = require('path');

// Read the local deployment file
const localDeploymentPath = path.join(__dirname, 'deployment-localhost.json');
console.log('Reading local deployment file:', localDeploymentPath);

try {
  const localDeployment = JSON.parse(fs.readFileSync(localDeploymentPath, 'utf8'));
  console.log('Local deployment file content:', localDeployment);

  // Write to the shared location
  const sharedDeploymentPath = path.join(__dirname, '../../deployment-localhost.json');
  console.log('Writing to shared deployment file:', sharedDeploymentPath);
  
  fs.writeFileSync(sharedDeploymentPath, JSON.stringify(localDeployment, null, 2));
  console.log('Successfully updated shared deployment file');
} catch (error) {
  console.error('Error updating shared deployment file:', error);
} 