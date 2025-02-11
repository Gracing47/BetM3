import { BrowserProvider, Contract, parseUnits } from "ethers";
import { useState, useEffect } from "react";
import StableTokenABI from "./cusd-abi.json";
import ValoraNFTABI from "./valora-nft.json";
import BetManagerABI from "./simple-bet-manager-abi.json";

export const useWeb3 = () => {
  const [address, setAddress] = useState<string | null>(null);
  const cUSDTokenAddress = "0x765de816845861e75a25fca122bb6898b8b1282a";
  const VALORA_NFT_CONTRACT = "0xDEd283f8Cc841a53BC2A85AD106b2654E650Cc7f";
  const BET_MANAGER_CONTRACT = "0x910273a1E3396e728CDe8B0748Fe1C0A36501BDA";

  useEffect(() => {
    const initWallet = async () => {
      if (typeof window === "undefined" || !window.ethereum) return;
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const addressFromWallet = await signer.getAddress();
          setAddress(addressFromWallet);
        }
      } catch (error) {
        console.error("Error initializing wallet:", error);
      }
    };

    // Handle account changes
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length > 0) {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const addressFromWallet = await signer.getAddress();
        setAddress(addressFromWallet);
      } else {
        setAddress(null);
      }
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    initWallet();

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const getUserAddress = async () => {
    if (typeof window === "undefined") return null;
    if (!window.ethereum) {
      console.log("Please install a Web3 wallet like MetaMask or Valora");
      return null;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addressFromWallet = await signer.getAddress();
      setAddress(addressFromWallet);
      return addressFromWallet;
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      return null;
    }
  };

  const sendCUSD = async (to: string, amount: string) => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const cUSDTokenContract = new Contract(
      cUSDTokenAddress,
      StableTokenABI.abi,
      signer
    );
    const amountInWei = parseUnits(amount, 18);
    const tx = await cUSDTokenContract.transfer(to, amountInWei);
    await tx.wait();
    return tx;
  };

  const mintValoraNFT = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const valoraNFTContract = new Contract(
      VALORA_NFT_CONTRACT,
      ValoraNFTABI.abi,
      signer
    );
    const userAddress = await signer.getAddress();
    const tx = await valoraNFTContract.safeMint(
      userAddress,
      "https://images.ctfassets.net/19mrfugtt46b/bpsU0fdOwCWTKPNIbBl9t/2ffd1e60b262a7d32a0e7025dfdf307e/Hero.png"
    );
    await tx.wait();
    return tx;
  };

  const getNFTs = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const valoraNFTContract = new Contract(
      VALORA_NFT_CONTRACT,
      ValoraNFTABI.abi,
      signer
    );
    const userAddress = await signer.getAddress();
    const nfts = await valoraNFTContract.getNFTsByAddress(userAddress);
    let tokenURIs = [];
    for (let i = 0; i < nfts.length; i++) {
      const tokenURI = await valoraNFTContract.tokenURI(nfts[i]);
      tokenURIs.push(tokenURI);
    }
    return tokenURIs;
  };

  const signTransaction = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const res = await signer.signMessage(
      `Hello from Celo Composer Valora Template!`
    );
    console.log("res", res);
    return res;
  };

  const getCUSDBalance = async (address: string) => {
    const provider = new BrowserProvider(window.ethereum);
    const cUSDContract = new Contract(
      cUSDTokenAddress,
      StableTokenABI.abi,
      provider
    );
    const balance = await cUSDContract.balanceOf(address);
    return balance;
  };

  const approveToken = async (amount: string) => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    // Check if user has enough cUSD
    const balance = await getCUSDBalance(userAddress);
    const amountInWei = parseUnits(amount, 18);
    if (balance < amountInWei) {
      throw new Error(`Insufficient cUSD balance. You need ${amount} cUSD to proceed.`);
    }

    const cUSDContract = new Contract(
      cUSDTokenAddress,
      StableTokenABI.abi,
      signer
    );
    const tx = await cUSDContract.approve(BET_MANAGER_CONTRACT, amountInWei);
    await tx.wait();
    return tx;
  };

  const createBet = async (stakeAmount: string, duration: number, condition: string) => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const betManagerContract = new Contract(
      BET_MANAGER_CONTRACT,
      BetManagerABI.abi,
      signer
    );
    const amountInWei = parseUnits(stakeAmount, 18);
    const tx = await betManagerContract.createBet(amountInWei, duration, condition);
    await tx.wait();
    return tx;
  };

  const addStake = async (betId: string) => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const betManagerContract = new Contract(
      BET_MANAGER_CONTRACT,
      BetManagerABI.abi,
      signer
    );
    const tx = await betManagerContract.addStake(betId);
    await tx.wait();
    return tx;
  };

  const getBetDetails = async (betId: string) => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const betManagerContract = new Contract(
      BET_MANAGER_CONTRACT,
      BetManagerABI.abi,
      signer
    );
    return await betManagerContract.getBetDetails(betId);
  };

  const claimStake = async (betId: string) => {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const betManagerContract = new Contract(
      BET_MANAGER_CONTRACT,
      BetManagerABI.abi,
      signer
    );
    const tx = await betManagerContract.claimStake(betId);
    await tx.wait();
    return tx;
  };

  return {
    address,
    getUserAddress,
    sendCUSD,
    mintValoraNFT,
    getNFTs,
    signTransaction,
    approveToken,
    createBet,
    addStake,
    getBetDetails,
    claimStake,
    getCUSDBalance,
  };
};
