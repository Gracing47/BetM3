import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { NoLossBetABI, MockCELOABI } from '../abis/generated/index';
import { CONTRACT_ADDRESSES } from '../config/contracts';

// Definiere die globale Window-Schnittstelle mit ethereum
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      isMetaMask?: boolean;
      selectedAddress?: string;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export interface Web3ContextType {
  address: string | null;
  getUserAddress: () => Promise<string>;
  disconnect: () => void;
  isConnecting: boolean;
  networkName: string;
  createBet: (creatorStake: string, opponentStake: string, condition: string, durationDays: string, prediction: boolean) => Promise<any>;
  acceptBet: (betId: string, prediction: boolean, customStake?: string) => Promise<any>;
  getBet: (betId: string) => Promise<any>;
  submitOutcome: (betId: string, outcome: boolean) => Promise<any>;
  resolveBet: (betId: string) => Promise<any>;
  resolveDispute: (betId: string, winner: string) => Promise<any>;
  approveToken: (amount: string) => Promise<any>;
  approveStableToken: (amount: string) => Promise<any>;
  getCELOBalance: (address: string | any) => Promise<bigint>;
  getNextBetId: () => Promise<number>;
  mintCELO: (amount: string) => Promise<any>;
  getNoLossBetAddress: () => string;
  getMockCELOAddress: () => string;
  getCUSDTokenAddress: () => string | undefined;
  getBetM3TokenAddress: () => string | undefined;
  getUniswapPoolMockAddress: () => string | undefined;
  getLPTokenAddress: () => string | undefined;
  connectWallet: () => Promise<void>;
}

const { 
  noLossBet: NO_LOSS_BET_ADDRESS,
  mockCELO: MOCK_CELO_ADDRESS
} = CONTRACT_ADDRESSES;

// Define undefined values for removed contracts
const CUSD_TOKEN_ADDRESS: string | undefined = undefined;
const BET_M3_TOKEN_ADDRESS: string | undefined = undefined;
const UNISWAP_POOL_MOCK_ADDRESS: string | undefined = undefined;
const LP_TOKEN_ADDRESS: string | undefined = undefined;

// Hardhat Netzwerk-Konfiguration
const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex für lokales Hardhat-Netzwerk

const HARDHAT_NETWORK_PARAMS = {
  chainId: HARDHAT_CHAIN_ID,
  chainName: 'Hardhat Local',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['http://localhost:8545'],
  blockExplorerUrls: []
};

const WALLET_KEY = 'wallet_connected'; // Key für localStorage

const Web3Context = createContext<Web3ContextType | null>(null);

// Add debounce utility at the top of the file
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // 1. All useState hooks
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [networkName, setNetworkName] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // 2. All useRef hooks
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // 3. All useCallback hooks
  const getNoLossBetAddress = useCallback((): string => NO_LOSS_BET_ADDRESS, []);
  const getMockCELOAddress = useCallback((): string => MOCK_CELO_ADDRESS, []);
  const getCUSDTokenAddress = useCallback((): string | undefined => CUSD_TOKEN_ADDRESS, []);
  const getBetM3TokenAddress = useCallback((): string | undefined => BET_M3_TOKEN_ADDRESS, []);
  const getUniswapPoolMockAddress = useCallback((): string | undefined => UNISWAP_POOL_MOCK_ADDRESS, []);
  const getLPTokenAddress = useCallback((): string | undefined => LP_TOKEN_ADDRESS, []);

  const getNoLossBetContract = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error("Cannot get contract in server-side environment");
    }
    if (!provider) throw new Error("Provider not initialized");
    return new ethers.Contract(
      NO_LOSS_BET_ADDRESS,
      NoLossBetABI,
      signer || provider
    );
  }, [provider, signer]);

  const getNextBetId = useCallback(async (): Promise<number> => {
    if (typeof window === 'undefined') {
      return 0;
    }
    try {
      const contract = getNoLossBetContract();
      const nextBetId = await contract.nextBetId();
      return Number(nextBetId);
    } catch (error) {
      console.error("Failed to get next bet ID:", error);
      return 0;
    }
  }, [getNoLossBetContract]);

  const getCeloTokenAddress = useCallback(() => {
    if (!provider) {
      return MOCK_CELO_ADDRESS;
    }
    return MOCK_CELO_ADDRESS;
  }, [provider]);

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      setAddress(null);
      setSigner(null);
      localStorage.removeItem(WALLET_KEY);
    } else {
      const account = accounts[0] as string | { toString(): string };
      const addressString = typeof account === 'string' ? account : 
                         (account && typeof account === 'object' && 'toString' in account) ? 
                         account.toString() : null;
      
      if (addressString && addressString.startsWith('0x')) {
        setAddress(addressString);
      } else {
        setAddress(null);
      }
      
      if (provider) {
        try {
          const signerInstance = await provider.getSigner();
          setSigner(signerInstance);
        } catch (error) {
          console.error("Failed to get signer after account change:", error);
          setSigner(null);
        }
      }
    }
  }, [provider]);

  const debouncedHandleChainChanged = useCallback(
    debounce((chainId: string) => {
      if (chainId !== HARDHAT_CHAIN_ID) {
        if (window.ethereum) {
          window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HARDHAT_CHAIN_ID }],
          }).catch(console.error);
        }
      } else {
        setNetworkName('Hardhat Local');
      }
    }, 500),
    []
  );

  const initializeProviderAndSigner = useCallback(async () => {
    if (!isBrowser) return;
    
    try {
      if (!window.ethereum) {
        console.warn("No ethereum object found. Please install MetaMask.");
        return;
      }
      
      // Check if the user explicitly disconnected
      if (localStorage.getItem('WALLET_EXPLICITLY_DISCONNECTED') === 'true') {
        console.log("User explicitly disconnected. Skipping auto-connect.");
        // Ensure we clear any connected state
        setAddress(null);
        setSigner(null);
        setProvider(null);
        return;
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      
      // Check if accounts are available
      const accounts = await web3Provider.listAccounts();
      if (accounts.length > 0) {
        setAddress(accounts[0].address);
        setSigner(await web3Provider.getSigner());
        
        // Store connection status
        localStorage.setItem('WALLET_CONNECTED', 'true');
      } else {
        // If no accounts are available, check if the user was previously connected
        if (localStorage.getItem('WALLET_CONNECTED') === 'true' && 
            localStorage.getItem('WALLET_EXPLICITLY_DISCONNECTED') !== 'true') {
          // Try to connect
          try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const newAccounts = await web3Provider.listAccounts();
            if (newAccounts.length > 0) {
              setAddress(newAccounts[0].address);
              setSigner(await web3Provider.getSigner());
            }
          } catch (error) {
            console.log("User rejected connection request");
            localStorage.removeItem('WALLET_CONNECTED');
          }
        }
      }
      
      // Update network name
      const network = await web3Provider.getNetwork();
      setNetworkName(network.chainId.toString());
      
    } catch (error) {
      console.error("Failed to initialize provider:", error);
    }
  }, [isBrowser]);

  const disconnect = useCallback(() => {
    console.log("Disconnecting wallet...");
    // Set the explicit disconnection flag in localStorage
    localStorage.setItem('WALLET_EXPLICITLY_DISCONNECTED', 'true');
    localStorage.removeItem('WALLET_CONNECTED');
    
    // Clear all connection state
    setAddress(null);
    setSigner(null);
    setProvider(null);
    setIsConnecting(false);
    
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', debouncedHandleChainChanged);
      } catch (error) {
        console.error("Error removing listeners during disconnect:", error);
      }
    }
    
    return Promise.resolve();
  }, [handleAccountsChanged, debouncedHandleChainChanged]);

  const getUserAddress = useCallback(async (): Promise<string> => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }
    
    setIsConnecting(true);
    try {
      localStorage.removeItem('WALLET_EXPLICITLY_DISCONNECTED');
      
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== HARDHAT_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HARDHAT_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [HARDHAT_NETWORK_PARAMS],
            });
          }
        }
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0] as string | { toString(): string };
      const addressString = typeof account === 'string' ? account : 
                         (account && typeof account === 'object' && 'toString' in account) ? 
                         account.toString() : null;
      
      if (!addressString || !addressString.startsWith('0x')) {
        throw new Error('Failed to get a valid Ethereum address');
      }
      
      setAddress(addressString);
      localStorage.setItem(WALLET_KEY, 'true');
      
      if (provider) {
        const signerInstance = await provider.getSigner();
        setSigner(signerInstance);
      } else {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        const signerInstance = await web3Provider.getSigner();
        setSigner(signerInstance);
      }
      setNetworkName('Hardhat Local');
      
      return addressString;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);

  const getContracts = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
  
      const noLossBet = new ethers.Contract(
        NO_LOSS_BET_ADDRESS,
        NoLossBetABI,
        signer
      );
  
      const mockCELO = new ethers.Contract(
        MOCK_CELO_ADDRESS,
        MockCELOABI,
        signer
      );
  
      // Only create contracts for addresses that exist
      let betM3Token = undefined;
      let uniswapPoolMock = undefined;
  
      return {
        signer,
        noLossBet,
        mockCELO,
        betM3Token,
        uniswapPoolMock
      };
    } catch (err) {
      console.error('Error getting contracts:', err);
      throw err;
    }
  }, []);

  const mintCELO = useCallback(async (amount: string = "110") => {
    try {
      const userAddress = address || await getUserAddress();
      const { mockCELO } = await getContracts();
      if (!mockCELO) {
        throw new Error("Failed to get MockCELO contract instance");
      }
      const amountWei = ethers.parseEther(amount);
      const mintTx = await mockCELO.simulateUnstaking(amountWei, {
        gasLimit: 300000
      });
      await mintTx.wait();
      return {
        success: true,
        hash: mintTx.hash,
        amount: amount
      };
    } catch (error: any) {
      console.error("Error minting CELO tokens:", error);
      throw new Error(`Failed to mint CELO tokens: ${error.message}`);
    }
  }, [address, getUserAddress, getContracts]);

  const createBet = useCallback(async (
    creatorStake: string,
    opponentStake: string,
    condition: string,
    durationDays: string,
    prediction: boolean
  ): Promise<any> => {
    if (isAttemptingConnection) {
      return Promise.reject(new Error("Wallet connection is in progress"));
    }
    try {
      const userAddress = await getUserAddress();
      if (!signer) throw new Error("No signer available");
      
      try {
        await mintCELO("200");
      } catch (mintError) {
        console.warn("Could not mint CELO tokens:", mintError);
      }

      const MIN_STAKE = "100";
      let creatorStakeAmount = creatorStake;
      if (!creatorStakeAmount || parseFloat(creatorStakeAmount) < parseFloat(MIN_STAKE)) {
        creatorStakeAmount = MIN_STAKE;
      }
      
      const creatorStakeAmountWei = ethers.parseEther(creatorStakeAmount);
      const opponentStakeAmountWei = ethers.parseEther(opponentStake);
      
      const celoTokenAddress = getCeloTokenAddress();
      const celoContract = new ethers.Contract(
        celoTokenAddress,
        ["function balanceOf(address) view returns (uint256)", 
         "function approve(address,uint256) returns (bool)"],
        signer
      );
      
      const balance = await celoContract.balanceOf(userAddress);
      if (balance < creatorStakeAmountWei) {
        throw new Error(`Insufficient CELO balance`);
      }
      
      const approveTx = await celoContract.approve(NO_LOSS_BET_ADDRESS, creatorStakeAmountWei, {
        gasLimit: ethers.toBigInt(1000000)
      });
      await approveTx.wait();
      
      const contract = new ethers.Contract(
        NO_LOSS_BET_ADDRESS,
        NoLossBetABI,
        signer
      );
      
      // Convert durationDays to BigInt if it's a string
      const durationDaysBigInt = durationDays ? ethers.toBigInt(durationDays) : ethers.toBigInt(0);
      
      const tx = await contract.createBet(
        creatorStakeAmountWei,
        opponentStakeAmountWei,
        condition,
        durationDaysBigInt,
        {
          gasLimit: ethers.toBigInt(5000000)
        }
      );
      
      await tx.wait();
      return tx;
    } catch (error: any) {
      console.error("Error in createBet:", error);
      throw new Error(`Error creating bet: ${error.message}`);
    }
  }, [signer, getUserAddress, isAttemptingConnection, getCeloTokenAddress, mintCELO]);

  const approveToken = useCallback(async (amount: string): Promise<any> => {
    try {
      const { mockCELO } = await getContracts();
      if (!mockCELO) throw new Error("MockCELO contract not initialized");
      
      // Get the NoLossBet address from the configuration
      const targetAddress = getNoLossBetAddress();
      
      console.log(`Approving ${amount} tokens for ${targetAddress}`);
      const amountWei = ethers.parseEther(amount);
      const tx = await mockCELO.approve(targetAddress, amountWei);
      await tx.wait();
      return tx;
    } catch (err) {
      console.error('Error approving tokens:', err);
      throw err;
    }
  }, [getContracts, getNoLossBetAddress]);

  // Function for the owner to approve stableToken transfers
  const approveStableToken = useCallback(async (amount: string) => {
    try {
      if (!signer) throw new Error("Wallet not connected");
      if (!address) throw new Error("Wallet address is not available");
      
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error("No Ethereum wallet found. Please install MetaMask or another compatible wallet.");
      }
      
      // Get the stableToken contract
      const stableTokenAddress = getCUSDTokenAddress();
      if (!stableTokenAddress) {
        throw new Error("Stable token address is not available");
      }
      
      const stableToken = new ethers.Contract(
        stableTokenAddress,
        [
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function allowance(address owner, address spender) external view returns (uint256)",
          "function balanceOf(address account) external view returns (uint256)"
        ],
        signer
      );
      
      // Get the NoLossBet address
      const noLossBetAddress = getNoLossBetAddress();
      
      // Check stableToken balance
      const balance = await stableToken.balanceOf(address);
      console.log(`Current stableToken balance: ${ethers.formatEther(balance)}`);
      
      // Check current allowance
      const currentAllowance = await stableToken.allowance(address, noLossBetAddress);
      console.log(`Current stableToken allowance: ${ethers.formatEther(currentAllowance)}`);
      
      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);
      
      // Check if balance is sufficient
      if (balance < amountWei) {
        throw new Error(`Insufficient stableToken balance. You have ${ethers.formatEther(balance)} but need ${amount}`);
      }
      
      // If current allowance is less than the requested amount, approve more
      if (currentAllowance < amountWei) {
        console.log(`Approving ${amount} stableTokens for ${noLossBetAddress}`);
        const tx = await stableToken.approve(noLossBetAddress, amountWei);
        console.log(`Waiting for stableToken approval transaction: ${tx.hash}`);
        await tx.wait();
        console.log(`StableToken approval confirmed`);
        return tx;
      } else {
        console.log(`Sufficient stableToken allowance already exists: ${ethers.formatEther(currentAllowance)}`);
        return { success: true, message: "Sufficient allowance already exists" };
      }
    } catch (err) {
      console.error('Error approving stableToken:', err);
      throw err;
    }
  }, [signer, address, getCUSDTokenAddress, getNoLossBetAddress]);

  const acceptBet = useCallback(async (
    betId: string, 
    prediction: boolean, 
    customStake?: string
  ): Promise<any> => {
    if (typeof window === 'undefined') {
      throw new Error("Cannot accept bet in server-side environment");
    }

    if (!signer) throw new Error("Wallet not connected");
    if (!address) throw new Error("Wallet address is not available");

    console.log(`Accepting bet: betId=${betId}, prediction=${prediction}, customStake=${customStake || 'default'}`);

    try {
      // Get contract instances
      const { mockCELO } = await getContracts();
      
      // Get NoLossBet contract with signer
      const noLossBetAddress = getNoLossBetAddress();
      const contract = new ethers.Contract(
        noLossBetAddress,
        NoLossBetABI,
        signer
      );
      
      // Convert betId to number
      const betIdNumber = parseInt(betId);
      
      // Check CELO balance
      const celoBalance = await mockCELO.balanceOf(address);
      console.log(`Current CELO balance: ${ethers.formatEther(celoBalance)} CELO`);
      
      // Get bet details to determine stake
      const betDetails = await contract.bets(betIdNumber);
      console.log("Bet details:", betDetails);
      
      // Determine stake amount - always ensure minimum 10 CELO
      let stakeAmount: bigint;
      if (customStake) {
        stakeAmount = ethers.parseEther(customStake);
      } else {
        stakeAmount = betDetails.opponentStake;
      }
      
      // Ensure minimum stake of 10 CELO
      const MIN_STAKE = ethers.parseEther("10");
      if (stakeAmount < MIN_STAKE) {
        console.log(`Stake amount ${ethers.formatEther(stakeAmount)} is below minimum. Using 10 CELO instead.`);
        stakeAmount = MIN_STAKE;
      }
      
      console.log(`Required stake: ${ethers.formatEther(stakeAmount)} (${stakeAmount.toString()})`);
      
      // Check if balance is sufficient
      if (celoBalance < stakeAmount) {
        throw new Error(`Insufficient CELO balance. You have ${ethers.formatEther(celoBalance)} CELO but need ${ethers.formatEther(stakeAmount)} CELO.`);
      }
      
      // Approve tokens for the transaction
      console.log(`Approving tokens for bet acceptance: ${ethers.formatEther(stakeAmount)}`);
      
      // Check current allowance
      const currentAllowance = await mockCELO.allowance(address, noLossBetAddress);
      console.log(`Current allowance: ${ethers.formatEther(currentAllowance)} CELO`);
      
      if (currentAllowance < stakeAmount) {
        console.log(`Insufficient allowance. Approving ${ethers.formatEther(stakeAmount)} CELO...`);
        const approveTx = await mockCELO.approve(
          noLossBetAddress,
          stakeAmount,
          { gasLimit: 300000 }
        );
        
        console.log(`Waiting for approval transaction: ${approveTx.hash}`);
        await approveTx.wait();
        console.log(`Approval confirmed`);
        
        // Add a short delay to ensure the blockchain has processed the approval
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`Sufficient allowance already exists: ${ethers.formatEther(currentAllowance)} CELO`);
      }
      
      // Call the acceptBet function with only 3 parameters, removing the empty string
      console.log(`Calling acceptBet with 3 parameters: ${betIdNumber}, ${prediction}, ${stakeAmount.toString()}`);
      
      try {
        const tx = await contract.acceptBet(
          betIdNumber, 
          prediction, 
          stakeAmount,
          {
            gasLimit: 500000,
            gasPrice: ethers.parseUnits("50", "gwei")
          }
        );
        
        console.log(`Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        
        return {
          success: true,
          transaction: tx,
          betId: betIdNumber
        };
      } catch (txError: any) {
        console.error("Transaction error details:", txError);
        
        // Extract revert reason from the error
        let errorMessage = txError.message || "Unknown error";
        
        // Check for revert reason in different places the error might store it
        const revertReason = 
          // Look for common error message patterns
          (errorMessage.match(/reverted with reason string ['"](.+?)['"]/i)?.[1]) ||
          (errorMessage.match(/reverted: (.+?)(?:\n|$)/i)?.[1]) ||
          // Check in error.reason
          txError.reason || 
          // Look in the error.error object (JSON-RPC errors)
          (txError.error && typeof txError.error === 'object' && txError.error.message) ||
          // Check for data.message pattern
          (txError.data && txError.data.message);
        
        if (revertReason) {
          console.log("Found revert reason:", revertReason);
          errorMessage = revertReason;
        }
        
        // Check for specific error conditions
        if (errorMessage.includes("Creator cannot accept own bet")) {
          throw new Error("You cannot accept your own bet.");
        } else if (errorMessage.includes("Bet already accepted")) {
          throw new Error("This bet has already been accepted by another user.");
        } else if (errorMessage.includes("Bet has expired")) {
          throw new Error("This bet has expired and can no longer be accepted.");
        } else if (errorMessage.includes("Opponent stake must be at least 10 CELO")) {
          throw new Error("The stake amount must be at least 10 CELO.");
        } else if (errorMessage.includes("Stake transfer failed")) {
          throw new Error("Failed to transfer CELO tokens. Please ensure you have approved enough tokens.");
        } else {
          // If we can't identify the specific error, provide more context
          console.log("Unhandled contract error:", errorMessage);
          throw new Error(`Transaction failed: ${errorMessage}`);
        }
      }
    } catch (error: any) {
      console.error("Error accepting bet:", error);
      throw new Error(`Failed to accept bet: ${error.message}`);
    }
  }, [getNoLossBetAddress, signer, address, getContracts]);

  const getCELOBalance = useCallback(async (address: string | any): Promise<bigint> => {
    try {
      let addressToUse = '';
      
      if (!address) return BigInt(0);
      
      if (typeof address === 'string' && address.startsWith('0x')) {
        addressToUse = address;
      } else if (typeof address === 'object') {
        if ('address' in address && typeof address.address === 'string') {
          addressToUse = address.address;
        } else if (address.toString && typeof address.toString === 'function') {
          const stringValue = address.toString();
          if (stringValue && typeof stringValue === 'string' && stringValue.startsWith('0x')) {
            addressToUse = stringValue;
          }
        }
      }
      
      if (!addressToUse || !addressToUse.startsWith('0x')) {
        return BigInt(0);
      }
      
      const localProvider = new ethers.JsonRpcProvider('http://localhost:8545');
      const mockCELO = new ethers.Contract(
        MOCK_CELO_ADDRESS,
        MockCELOABI,
        localProvider
      );
      
      const formattedAddress = ethers.getAddress(addressToUse);
      const balance = await mockCELO.balanceOf(formattedAddress);
      return balance;
    } catch (err) {
      console.error('Error in getCELOBalance:', err);
      return BigInt(0);
    }
  }, []);

  const getBet = useCallback(async (betId: string): Promise<any> => {
    try {
      const { noLossBet } = await getContracts();
      if (!noLossBet) throw new Error("Contracts not initialized");
      
      const bet = await noLossBet.bets(betId);
      
      // Determine if outcomes have been submitted
      // In a newly created bet, the opponent is address(0) and outcomes are initialized to false but not actually submitted
      const hasOpponent = bet.opponent !== ethers.ZeroAddress;
      
      return {
        id: betId,
        creator: bet.creator,
        opponent: bet.opponent,
        amount: bet.creatorStake,
        opponentStake: bet.opponentStake,
        condition: bet.condition,
        // If the bet is just created, the creator hasn't submitted an outcome yet
        creatorOutcome: hasOpponent ? bet.creatorOutcome : null,
        // When the opponent joins, they submit their outcome, so it's a valid value
        opponentOutcome: hasOpponent ? bet.opponentOutcome : null,
        resolved: bet.resolved,
        expirationTime: bet.expiration
      };
    } catch (err) {
      console.error('Error getting bet:', err);
      throw err;
    }
  }, [getContracts]);

  const submitOutcome = useCallback(async (betId: string, outcome: boolean): Promise<any> => {
    try {
      const { noLossBet } = await getContracts();
      if (!noLossBet) throw new Error("Contracts not initialized");
      
      const tx = await noLossBet.submitOutcome(betId, outcome, {
        gasLimit: 500000
      });
      await tx.wait();
      return {
        success: true,
        betId,
        outcome,
        txHash: tx.hash
      };
    } catch (err) {
      console.error('Error submitting outcome:', err);
      throw err;
    }
  }, [getContracts]);

  const resolveBet = useCallback(async (betId: string): Promise<any> => {
    try {
      const { noLossBet } = await getContracts();
      if (!noLossBet) throw new Error("Contracts not initialized");
      
      const tx = await noLossBet.resolveBet(betId);
      await tx.wait();
      return { success: true, betId, status: "resolved" };
    } catch (err) {
      console.error('Error resolving bet:', err);
      throw err;
    }
  }, [getContracts]);

  const resolveDispute = useCallback(async (betId: string, winner: string): Promise<any> => {
    try {
      const { noLossBet } = await getContracts();
      if (!noLossBet) throw new Error("Contracts not initialized");
      
      const tx = await noLossBet.resolveDispute(betId, winner === 'creator');
      await tx.wait();
      return { success: true, betId, winner };
    } catch (err) {
      console.error('Error resolving dispute:', err);
      throw err;
    }
  }, [getContracts]);

  // Füge die connectWallet-Funktion hinzu
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }
    
    setIsConnecting(true);
    
    try {
      // Entferne den expliziten Disconnect-Flag
      localStorage.removeItem('WALLET_EXPLICITLY_DISCONNECTED');
      
      // Fordere Konten an
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts.length > 0) {
        // Initialisiere Provider und Signer
        await initializeProviderAndSigner();
        
        // Speichere den Verbindungsstatus
        localStorage.setItem('WALLET_CONNECTED', 'true');
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [initializeProviderAndSigner]);

  // 4. All useEffect hooks
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (mounted && isBrowser) {
      const initAndSetAddress = async () => {
        await initializeProviderAndSigner();
        setAddress('0xdD2FD4581271e230360230F9337D5c0430Bf44C0');
      };
      initAndSetAddress();
    }
  }, [mounted, initializeProviderAndSigner, isBrowser]);

  useEffect(() => {
    mountedRef.current = true;

    const ethereum = window?.ethereum;
    if (isBrowser && ethereum && localStorage.getItem('WALLET_EXPLICITLY_DISCONNECTED') !== 'true') {
      const restoreConnection = async () => {
        try {
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            await initializeProviderAndSigner();
            localStorage.setItem('WALLET_CONNECTED', 'true');
          }
        } catch (error) {
          console.error("Error restoring connection:", error);
        }
      };
      
      restoreConnection();

      const handleChainChange = () => {
        if (mountedRef.current) {
          initializeProviderAndSigner();
        }
      };

      const handleAccountsChange = () => {
        if (mountedRef.current) {
          initializeProviderAndSigner();
        }
      };

      ethereum.on('chainChanged', handleChainChange);
      ethereum.on('accountsChanged', handleAccountsChange);

      return () => {
        mountedRef.current = false;
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
        }
        ethereum.removeListener('chainChanged', handleChainChange);
        ethereum.removeListener('accountsChanged', handleAccountsChange);
      };
    }
  }, [initializeProviderAndSigner, isBrowser]);

  // 5. Early return for server-side rendering
  if (!mounted || !isBrowser) {
    return (
      <Web3Context.Provider
        value={{
          address: null,
          getUserAddress: async () => { throw new Error('Not available') },
          disconnect: () => { },
          isConnecting: false,
          networkName: '',
          createBet: async () => { throw new Error('Not available') },
          acceptBet: async () => { throw new Error('Not available') },
          getBet: async () => { throw new Error('Not available') },
          submitOutcome: async () => { throw new Error('Not available') },
          resolveBet: async () => { throw new Error('Not available') },
          resolveDispute: async () => { throw new Error('Not available') },
          getCELOBalance: async () => { throw new Error('Not available') },
          getNextBetId: async () => { throw new Error('Not available') },
          approveToken: async () => { throw new Error('Not available') },
          approveStableToken: async () => { throw new Error('Not available') },
          mintCELO: async () => { throw new Error('Not available') },
          getNoLossBetAddress: () => NO_LOSS_BET_ADDRESS,
          getMockCELOAddress: () => MOCK_CELO_ADDRESS,
          getCUSDTokenAddress: () => undefined,
          getBetM3TokenAddress: () => undefined,
          getUniswapPoolMockAddress: () => undefined,
          getLPTokenAddress: () => undefined,
          connectWallet: async () => { throw new Error('Not available') }
        }}
      >
        {children}
      </Web3Context.Provider>
    );
  }

  return (
    <Web3Context.Provider
      value={{
        address,
        getUserAddress,
        disconnect,
        isConnecting,
        networkName,
        createBet,
        acceptBet,
        getBet,
        submitOutcome,
        resolveBet,
        resolveDispute,
        approveToken,
        approveStableToken,
        getCELOBalance,
        getNextBetId,
        mintCELO,
        getNoLossBetAddress,
        getMockCELOAddress,
        getCUSDTokenAddress,
        getBetM3TokenAddress,
        getUniswapPoolMockAddress,
        getLPTokenAddress,
        connectWallet
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === null) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};