async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Deploy BetM3Token
  const BetM3Token = await ethers.getContractFactory("BetM3Token");
  const betM3Token = await BetM3Token.deploy();
  await betM3Token.deployed();
  console.log("BetM3Token deployed to:", betM3Token.address);

  // Deploy NoLossBet
  const celoTokenAddress = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // CELO auf Alfajores
  const aavePoolAddress = "0x..."; // Ersetze mit echter Aave-Pool-Adresse auf Celo
  const NoLossBet = await ethers.getContractFactory("NoLossBet");
  const noLossBet = await NoLossBet.deploy(celoTokenAddress, betM3Token.address, aavePoolAddress);
  await noLossBet.deployed();
  console.log("NoLossBet deployed to:", noLossBet.address);

  // BetM3Token an NoLossBet übertragen
  await betM3Token.transfer(noLossBet.address, ethers.utils.parseEther("1000"));
  console.log("Transferred 1000 BETM3 to NoLossBet");

  console.log("Contracts deployed:");
  console.log("BetM3Token:", betM3Token.address);
  console.log("NoLossBet:", noLossBet.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 