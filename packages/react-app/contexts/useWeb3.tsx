import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import SimpleBetManagerABI from './simple-bet-manager-abi.json';
import celoTokenABI from './celo-abi.json';

interface Web3ContextType {
  address: string | null;
  getUserAddress: () => Promise<string>;
  disconnect: () => void;
  isConnecting: boolean;
  createBet: (amount: string, duration: number, condition: string) => Promise<any>;
  addStake: (betId: string) => Promise<any>;
  getBetDetails: (betId: string) => Promise<any>;
  getBetParticipants: (betId: string) => Promise<string[]>;
  claimStake: (betId: string) => Promise<any>;
  approveToken: (amount: string) => Promise<any>;
  getCELOBalance: (address: string) => Promise<bigint>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

const SIMPLE_BET_MANAGER_ADDRESS = "0x910273a1E3396e728CDe8B0748Fe1C0A36501BDA";
const CELO_TOKEN_ADDRESS = "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9"; // Alfajores CELO token address
const WALLET_KEY = 'wallet_connected'; // Key for localStorage

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-connect on startup if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      const shouldConnect = localStorage.getItem(WALLET_KEY) === 'true';
      if (shouldConnect && window.ethereum) {
        try {
          setIsConnecting(true);
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
          }
        } catch (err) {
          console.error('Auto-connect failed:', err);
          localStorage.removeItem(WALLET_KEY);
        } finally {
          setIsConnecting(false);
        }
      }
    };
    autoConnect();
  }, []);

  const getProvider = useCallback(() => {
    if (!window.ethereum) {
      throw new Error("Please install a web3 wallet");
    }
    
    // Ensure we're on Alfajores testnet
    window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaef3' }], // 44787 in hex
    }).catch((switchError) => {
      // If chain hasn't been added to MetaMask
      if (switchError.code === 4902) {
        window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaef3',
            chainName: 'Alfajores Testnet',
            nativeCurrency: {
              name: 'Celo',
              symbol: 'CELO',
              decimals: 18
            },
            rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
            blockExplorerUrls: ['https://alfajores.celoscan.io/']
          }]
        });
      }
    });

    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const getContracts = useCallback(async () => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      // Verify network
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      if (chainId !== 44787) {
        throw new Error(`Wrong network. Please connect to Alfajores Testnet. Current chainId: ${chainId}`);
      }
      console.log("Connected to network:", network);

      const betManager = new ethers.Contract(
        SIMPLE_BET_MANAGER_ADDRESS,
        SimpleBetManagerABI.abi,
        signer
      );

      const celoToken = new ethers.Contract(
        CELO_TOKEN_ADDRESS,
        celoTokenABI.abi,
        signer
      );

      // Verify contracts are deployed
      const code = await provider.getCode(SIMPLE_BET_MANAGER_ADDRESS);
      if (code === '0x') {
        throw new Error('BetManager contract not deployed at this address');
      }

      return { betManager, celoToken };
    } catch (err) {
      console.error("Error initializing contracts:", err);
      throw err;
    }
  }, []);

  const getUserAddress = useCallback(async () => {
    try {
      setIsConnecting(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAddress(address);
      localStorage.setItem(WALLET_KEY, 'true');
      return address;
    } catch (err) {
      console.error("Error getting user address:", err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(WALLET_KEY);
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
    try {
      const { betManager } = await getContracts();
      console.log("Getting bet details for ID:", betId);
      console.log("Contract address:", await betManager.getAddress());
      const id = ethers.getBigInt(betId);
      
      // First check if bet exists
      try {
        const details = await betManager.getBetDetails(id);
        console.log("Bet details:", details);
        return details;
      } catch (err: any) {
        if (err.message.includes("revert")) {
          console.log("Bet does not exist");
          return null;
        }
        throw err;
      }
    } catch (err) {
      console.error("Error getting bet details:", err);
      return null;
    }
  }, []);

  const getBetParticipants = useCallback(async (betId: string) => {
    try {
      const { betManager } = await getContracts();
      const id = ethers.getBigInt(betId);
      return await betManager.getBetParticipants(id);
    } catch (err) {
      console.error("Error getting bet participants:", err);
      return [];
    }
  }, []);

  const claimStake = useCallback(async (betId: string) => {
    try {
      const { betManager } = await getContracts();
      const id = ethers.getBigInt(betId);
      return await betManager.claimStake(id);
    } catch (err) {
      console.error("Error claiming stake:", err);
      throw err;
    }
  }, []);

  const approveToken = useCallback(async (amount: string) => {
    try {
      const { celoToken } = await getContracts();
      const amountBN = ethers.getBigInt(amount);
      return await celoToken.approve(SIMPLE_BET_MANAGER_ADDRESS, amountBN);
    } catch (err) {
      console.error("Error approving tokens:", err);
      throw err;
    }
  }, []);

  const getCELOBalance = useCallback(async (address: string) => {
    try {
      const { celoToken } = await getContracts();
      const balance = await celoToken.balanceOf(address);
      return balance;
    } catch (err) {
      console.error("Error getting CELO balance:", err);
      return BigInt(0);
    }
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          setAddress(null);
          localStorage.removeItem(WALLET_KEY);
        }
      });

      window.ethereum.on('chainChanged', () => {
        // Reload the page on chain change
        window.location.reload();
      });

      window.ethereum.on('disconnect', () => {
        setAddress(null);
        localStorage.removeItem(WALLET_KEY);
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
        window.ethereum.removeListener('disconnect', () => {});
      }
    };
  }, []);

  const value = {
    address,
    getUserAddress,
    disconnect,
    isConnecting,
    createBet,
    addStake,
    getBetDetails,
    getBetParticipants,
    claimStake,
    approveToken,
    getCELOBalance,
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
