import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Web3Context, Web3ContextType } from './web3Context';
import { NoLossBetABI, MockCELOABI } from '../abis/generated/index';
import { CONTRACT_ADDRESSES } from '../config/contracts';

// Use the imported contract addresses
const { 
  noLossBet: NO_LOSS_BET_ADDRESS,
  mockCELO: MOCK_CELO_ADDRESS
} = CONTRACT_ADDRESSES;

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkName, setNetworkName] = useState('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Initialize provider and signer
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(web3Provider);
          
          const accounts = await web3Provider.listAccounts();
          if (accounts.length > 0) {
            setAddress(accounts[0].address);
            setSigner(await web3Provider.getSigner());
          }
          
          const network = await web3Provider.getNetwork();
          setNetworkName(network.name);
        } catch (error) {
          console.error("Failed to initialize provider:", error);
        }
      }
    };
    
    init();
    
    // Setup event listeners
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setAddress(null);
          setSigner(null);
        } else {
          setAddress(accounts[0]);
          if (provider) {
            provider.getSigner().then(setSigner);
          }
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', () => {});
          window.ethereum.removeListener('chainChanged', () => {});
        }
      }
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask.');
    }
    
    setIsConnecting(true);
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        setAddress(accounts[0]);
        setSigner(await web3Provider.getSigner());
        
        const network = await web3Provider.getNetwork();
        setNetworkName(network.name);
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    return Promise.resolve();
  }, []);

  const getUserAddress = useCallback(async (): Promise<string> => {
    if (address) return address;
    
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask.');
    }
    
    setIsConnecting(true);
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        return accounts[0];
      }
      
      throw new Error('No accounts found');
    } catch (error) {
      console.error("Failed to get user address:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [address]);

  const getNoLossBetContract = useCallback(() => {
    if (!signer) throw new Error("Wallet not connected");
    
    return new ethers.Contract(
      NO_LOSS_BET_ADDRESS,
      NoLossBetABI,
      signer
    );
  }, [signer]);

  const getMockCELOContract = useCallback(() => {
    if (!signer) throw new Error("Wallet not connected");
    
    return new ethers.Contract(
      MOCK_CELO_ADDRESS,
      MockCELOABI,
      signer
    );
  }, [signer]);

  const getNoLossBetAddress = useCallback((): string => {
    return NO_LOSS_BET_ADDRESS;
  }, []);

  const getMockCELOAddress = useCallback((): string => {
    return MOCK_CELO_ADDRESS;
  }, []);

  const createBet = useCallback(async (
    creatorStake: string,
    opponentStake: string,
    condition: string,
    durationDays: string,
    prediction: boolean
  ): Promise<any> => {
    try {
      const contract = getNoLossBetContract();
      const creatorStakeWei = ethers.parseEther(creatorStake);
      const opponentStakeWei = ethers.parseEther(opponentStake);
      const durationDaysBigInt = BigInt(durationDays);
      
      // Approve tokens first
      await approveToken(creatorStake);
      
      const tx = await contract.createBet(
        creatorStakeWei,
        opponentStakeWei,
        condition,
        durationDaysBigInt,
        { gasLimit: 5000000 }
      );
      
      return await tx.wait();
    } catch (error) {
      console.error("Error creating bet:", error);
      throw error;
    }
  }, [getNoLossBetContract]);

  const acceptBet = useCallback(async (
    betId: string,
    prediction: boolean,
    customStake?: string
  ): Promise<any> => {
    try {
      const contract = getNoLossBetContract();
      const betIdNumber = parseInt(betId);
      
      // If customStake is provided, convert it to wei
      const customStakeWei = customStake ? ethers.parseEther(customStake) : BigInt(0);
      
      // Approve tokens first if customStake is provided
      if (customStake) {
        await approveToken(customStake);
      }
      
      const tx = await contract.acceptBet(
        betIdNumber,
        prediction,
        customStakeWei,
        { gasLimit: 5000000 }
      );
      
      return await tx.wait();
    } catch (error) {
      console.error("Error accepting bet:", error);
      throw error;
    }
  }, [getNoLossBetContract]);

  const getBet = useCallback(async (betId: string): Promise<any> => {
    try {
      const contract = getNoLossBetContract();
      const bet = await contract.bets(betId);
      
      return {
        id: betId,
        creator: bet.creator,
        opponent: bet.opponent,
        amount: bet.creatorStake.toString(),
        opponentStake: bet.opponentStake.toString(),
        condition: bet.condition,
        creatorOutcome: bet.creatorOutcome,
        opponentOutcome: bet.opponentOutcome,
        resolved: bet.resolved,
        expirationTime: Number(bet.expiration),
        status: bet.resolved ? 'Completed' : 
                bet.opponent !== ethers.ZeroAddress ? 'Active' : 'Created'
      };
    } catch (error) {
      console.error("Error getting bet:", error);
      throw error;
    }
  }, [getNoLossBetContract]);

  const getNextBetId = useCallback(async (): Promise<number> => {
    try {
      const contract = getNoLossBetContract();
      const nextBetId = await contract.nextBetId();
      return Number(nextBetId);
    } catch (error) {
      console.error("Error getting next bet ID:", error);
      return 0;
    }
  }, [getNoLossBetContract]);

  const submitOutcome = useCallback(async (betId: string, outcome: boolean): Promise<any> => {
    try {
      const contract = getNoLossBetContract();
      const tx = await contract.submitOutcome(betId, outcome, { gasLimit: 500000 });
      return tx;
    } catch (error) {
      console.error("Error submitting outcome:", error);
      throw error;
    }
  }, [getNoLossBetContract]);

  const resolveBet = useCallback(async (betId: string): Promise<any> => {
    try {
      const contract = getNoLossBetContract();
      const tx = await contract.resolveBet(betId, { gasLimit: 500000 });
      return tx;
    } catch (error) {
      console.error("Error resolving bet:", error);
      throw error;
    }
  }, [getNoLossBetContract]);

  const approveToken = useCallback(async (amount: string): Promise<any> => {
    try {
      const celoContract = getMockCELOContract();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await celoContract.approve(NO_LOSS_BET_ADDRESS, amountWei, {
        gasLimit: 200000
      });
      
      return await tx.wait();
    } catch (error) {
      console.error("Error approving tokens:", error);
      throw error;
    }
  }, [getMockCELOContract]);

  const mintCELO = useCallback(async (amount: string): Promise<any> => {
    try {
      const celoContract = getMockCELOContract();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await celoContract.simulateUnstaking(amountWei, {
        gasLimit: 300000
      });
      
      return tx;
    } catch (error) {
      console.error("Error minting CELO:", error);
      throw error;
    }
  }, [getMockCELOContract]);

  const getCELOBalance = useCallback(async (address?: string): Promise<bigint> => {
    try {
      const celoContract = getMockCELOContract();
      const targetAddress = address || await getUserAddress();
      
      const balance = await celoContract.balanceOf(targetAddress);
      return balance;
    } catch (error) {
      console.error("Error getting CELO balance:", error);
      return BigInt(0);
    }
  }, [getMockCELOContract, getUserAddress]);

  const contextValue: Web3ContextType = {
    address,
    isConnecting,
    networkName,
    connectWallet,
    disconnect,
    getUserAddress,
    createBet,
    acceptBet,
    getBet,
    getNextBetId,
    submitOutcome,
    resolveBet,
    approveToken,
    mintCELO,
    getCELOBalance,
    getNoLossBetAddress,
    getMockCELOAddress
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Provider; 