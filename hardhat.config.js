require("@nomicfoundation/hardhat-toolbox");
const path = require("path");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      chainId: 44787
    }
  },
  paths: {
    sources: path.join(__dirname, "packages/hardhat/contracts"),
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}; 