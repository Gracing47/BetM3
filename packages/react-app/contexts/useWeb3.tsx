import React, { createContext, useContext, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import SimpleBetManagerABI from './simple-bet-manager-abi.json';
import cUSDTokenABI from './cusd-abi.json';

interface Web3ContextType {
  address: string | null;
  getUserAddress: () => Promise<string>;
  createBet: (amount: string, duration: number, condition: string) => Promise<any>;
  addStake: (betId: string) => Promise<any>;
  getBetDetails: (betId: string) => Promise<any>;
  getBetParticipants: (betId: string) => Promise<string[]>;
  claimStake: (betId: string) => Promise<any>;
  approveToken: (amount: string) => Promise<any>;
  getCUSDBalance: (address: string) => Promise<bigint>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

const SIMPLE_BET_MANAGER_ADDRESS = "0x1234567890123456789012345678901234567890"; // Replace with actual contract address
const CUSD_TOKEN_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; // cUSD token on Celo

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);

  const getProvider = useCallback(() => {
    if (!window.ethereum) {
      throw new Error("Please install a web3 wallet");
    }
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const getContracts = useCallback(async () => {
    const provider = getProvider();
    const signer = await provider.getSigner();
    
    const betManager = new ethers.Contract(
      SIMPLE_BET_MANAGER_ADDRESS,
      SimpleBetManagerABI.abi,
      signer
    );
    
    const cusdToken = new ethers.Contract(
      CUSD_TOKEN_ADDRESS,
      cUSDTokenABI.abi,
      signer
    );

    return { betManager, cusdToken };
  }, []);

  const getUserAddress = useCallback(async () => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAddress(address);
      return address;
    } catch (err) {
      console.error("Error getting user address:", err);
      throw err;
    }
  }, []);

  const createBet = useCallback(async (amount: string, duration: number, condition: string) => {
    const { betManager } = await getContracts();
    return betManager.createBet(amount, duration, condition);
  }, []);

  const addStake = useCallback(async (betId: string) => {
    const { betManager } = await getContracts();
    return betManager.addStake(betId);
  }, []);

  const getBetDetails = useCallback(async (betId: string) => {
    const { betManager } = await getContracts();
    return betManager.getBetDetails(betId);
  }, []);

  const getBetParticipants = useCallback(async (betId: string) => {
    const { betManager } = await getContracts();
    return betManager.getBetParticipants(betId);
  }, []);

  const claimStake = useCallback(async (betId: string) => {
    const { betManager } = await getContracts();
    return betManager.claimStake(betId);
  }, []);

  const approveToken = useCallback(async (amount: string) => {
    const { cusdToken } = await getContracts();
    return cusdToken.approve(SIMPLE_BET_MANAGER_ADDRESS, amount);
  }, []);

  const getCUSDBalance = useCallback(async (address: string) => {
    const { cusdToken } = await getContracts();
    return cusdToken.balanceOf(address);
  }, []);

  // Listen for account changes
  React.useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          setAddress(null);
        }
      });
    }
  }, []);

  const value = {
    address,
    getUserAddress,
    createBet,
    addStake,
    getBetDetails,
    getBetParticipants,
    claimStake,
    approveToken,
    getCUSDBalance,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
