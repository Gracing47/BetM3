import { createContext, useContext } from 'react';
import { ethers } from 'ethers';

// Define the Web3Context type
export interface Web3ContextType {
  address: string | null;
  isConnecting: boolean;
  networkName: string;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  submitOutcome: (betId: string, outcome: boolean) => Promise<any>;
  resolveBet: (betId: string) => Promise<any>;
  mintCELO: (amount: string) => Promise<any>;
  getCELOBalance: (address?: string) => Promise<bigint>;
  getUserAddress: () => Promise<string>;
  createBet: (creatorStake: string, condition: string, durationDays: string, prediction: boolean) => Promise<any>;
  acceptBet: (betId: string, prediction: boolean, customStake?: string) => Promise<any>;
  getBet: (betId: string) => Promise<any>;
  getParticipantStake: (betId: string, participant: string) => Promise<string>;
  getNextBetId: () => Promise<number>;
  approveToken: (amount: string) => Promise<any>;
  getNoLossBetAddress: () => string;
  getMockCELOAddress: () => string;
}

// Create the context
export const Web3Context = createContext<Web3ContextType | null>(null);

// Export the hook
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}; 