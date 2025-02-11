import { ethers } from "hardhat";

async function main() {
  const valoraNFT = await ethers.deployContract("Valora", [
    "0x0D6Dc2f182Eafa687090F95466d5368726C1ca45",
  ]);

  await valoraNFT.waitForDeployment();

  console.log("Valora NFT address - " + (await valoraNFT.getAddress()));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
