import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { NoLossBetABI, MockCELOABI, UniswapPoolMockABI, BetM3TokenABI } from '../abis/generated/index';
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
  acceptBet: (betId: string, prediction: boolean, customStake?: string, commentText?: string) => Promise<any>;
  getBet: (betId: string) => Promise<any>;
  submitOutcome: (betId: string, outcome: boolean) => Promise<any>;
  resolveBet: (betId: string) => Promise<any>;
  resolveDispute: (betId: string, winner: string) => Promise<any>;
  approveToken: (amount: string) => Promise<any>;
  getCELOBalance: (address: string | any) => Promise<bigint>;
  getNextBetId: () => Promise<number>;
  mintCELO: (amount: string) => Promise<any>;
  getNoLossBetAddress: () => string;
  getMockCELOAddress: () => string;
  getCUSDTokenAddress: () => string;
  getBetM3TokenAddress: () => string;
  getUniswapPoolMockAddress: () => string;
  getLPTokenAddress: () => string;
}

const { 
  noLossBet: NO_LOSS_BET_ADDRESS,
  mockCELO: MOCK_CELO_ADDRESS,
  cUSDToken: CUSD_TOKEN_ADDRESS,
  betM3Token: BET_M3_TOKEN_ADDRESS,
  uniswapPoolMock: UNISWAP_POOL_MOCK_ADDRESS,
  lpToken: LP_TOKEN_ADDRESS,
} = CONTRACT_ADDRESSES;

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
  
  // If we're not in a browser environment, render only children
  if (!isBrowser) {
    const dummyContextValue: Web3ContextType = {
      address: null,
      isConnecting: false,
      networkName: '',
      disconnect: () => {},
      getUserAddress: async () => '',
      getCELOBalance: async () => BigInt(0),
      getNextBetId: async () => 0,
      createBet: async () => { throw new Error('Not available server-side') },
      acceptBet: async () => { throw new Error('Not available server-side') },
      getBet: async () => { throw new Error('Not available server-side') },
      submitOutcome: async () => { throw new Error('Not available server-side') },
      resolveBet: async () => { throw new Error('Not available server-side') },
      resolveDispute: async () => { throw new Error('Not available server-side') },
      approveToken: async () => { throw new Error('Not available server-side') },
      mintCELO: async () => { throw new Error('Not available server-side') },
      getNoLossBetAddress: () => '',
      getMockCELOAddress: () => '',
      getCUSDTokenAddress: () => '',
      getBetM3TokenAddress: () => '',
      getUniswapPoolMockAddress: () => '',
      getLPTokenAddress: () => ''
    };
    
    return (
      <Web3Context.Provider value={dummyContextValue}>
        {children}
      </Web3Context.Provider>
    );
  }
  
  // State
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [networkName, setNetworkName] = useState<string>('Hardhat Local');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const initializeProviderAndSigner = useCallback(async () => {
    if (!window.ethereum) {
      console.warn("No ethereum object found. Please install MetaMask.");
      return false;
    }

    // Prevent multiple simultaneous initializations
    if (isInitializing) {
      console.log("Provider initialization already in progress, skipping");
      return false;
    }

    try {
      setIsInitializing(true);
      
      // Check if we're on Hardhat network, switch if not
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== HARDHAT_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HARDHAT_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [HARDHAT_NETWORK_PARAMS],
              });
            } catch (addError) {
              console.error('Error adding Hardhat network:', addError);
            }
          } else {
            console.error('Error switching to Hardhat network:', switchError);
          }
        }
      }
      
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      const accounts = await web3Provider.listAccounts();
      if (accounts.length > 0) {
        // Make sure we're storing a proper string address
        const account = accounts[0];
        console.log("Got account from provider:", account, "type:", typeof account);
        
        if (account) {
          let addressString: string;
          
          if (typeof account === 'string') {
            addressString = account;
          } else if (typeof account === 'object' && 'address' in account && typeof account.address === 'string') {
            addressString = account.address;
          } else if (typeof account.toString === 'function') {
            const str = account.toString();
            if (str && str.startsWith('0x')) {
              addressString = str;
            } else {
              console.error("Account toString() did not return a valid address:", str);
              return false;
            }
          } else {
            console.error("Could not extract a valid address from account:", account);
            return false;
          }
          
          if (addressString && addressString.startsWith('0x')) {
            setAddress(addressString);
            console.log("Set address to:", addressString);
          } else {
            console.error("Invalid address format:", addressString);
            return false;
          }
        } else {
          console.error("Account is null or undefined");
          return false;
        }
        
        const signerInstance = await web3Provider.getSigner();
        setSigner(signerInstance);
        setNetworkName('Hardhat Local');
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to initialize provider and signer:", error);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing]);

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      setAddress(null);
      setSigner(null);
      localStorage.removeItem(WALLET_KEY);
    } else {
      // Ensure we're storing a proper string address, not an object
      console.log("Account changed to:", accounts[0], "type:", typeof accounts[0]);
      
      // Properly type the account
      const account = accounts[0] as string | { toString(): string };
      
      const addressString = typeof account === 'string' ? account : 
                           (account && typeof account === 'object' && 'toString' in account) ? 
                           account.toString() : null;
      
      if (addressString && addressString.startsWith('0x')) {
        setAddress(addressString);
        console.log("Set address to:", addressString);
      } else {
        console.error("Invalid address format from accounts change:", accounts[0]);
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

  // Debounced version of handleChainChanged
  const debouncedHandleChainChanged = useCallback(
    debounce((chainId: string) => {
      if (chainId !== HARDHAT_CHAIN_ID) {
        console.warn('Network changed to non-Hardhat network. Attempting to switch back...');
        // Attempt to switch back to Hardhat
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
  
  // Debounced initialization function
  const debouncedInitialize = useCallback(
    debounce(async () => {
      if (!mountedRef.current || isInitializing) return;

      try {
        setIsInitializing(true);
        await initializeProviderAndSigner();
      } finally {
        if (mountedRef.current) {
          setIsInitializing(false);
        }
      }
    }, 1000),
    [initializeProviderAndSigner]
  );

  useEffect(() => {
    mountedRef.current = true;

    const ethereum = window?.ethereum;
    if (typeof window !== 'undefined' && ethereum) {
      // Initial setup
      debouncedInitialize();

      // Event listeners
      const handleChainChange = () => {
        if (mountedRef.current) {
          debouncedInitialize();
        }
      };

      const handleAccountsChange = () => {
        if (mountedRef.current) {
          debouncedInitialize();
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
  }, [debouncedInitialize]);
  
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
    // Use MOCK_CELO_ADDRESS for local development or if chainId is not available
    if (!provider) {
      return MOCK_CELO_ADDRESS;
    }
    
    // Try to get chainId from the provider
    return MOCK_CELO_ADDRESS; // Default to mock for now since we're mainly testing locally
  }, [provider]);
  
  const getUserAddress = useCallback(async (): Promise<string> => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }
    setIsConnecting(true);
    try {
      // Ensure we're on Hardhat network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== HARDHAT_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HARDHAT_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [HARDHAT_NETWORK_PARAMS],
              });
            } catch (addError) {
              console.error('Error adding Hardhat network:', addError);
              throw addError;
            }
          }
        }
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Retrieved accounts:", accounts, "type of first account:", typeof accounts[0]);
      
      // Properly type the account
      const account = accounts[0] as string | { toString(): string };
      
      // Ensure we're storing a proper string address, not an object
      const addressString = typeof account === 'string' ? account : 
                           (account && typeof account === 'object' && 'toString' in account) ? 
                           account.toString() : null;
      
      if (!addressString || !addressString.startsWith('0x')) {
        console.error("Invalid address format:", accounts[0]);
        throw new Error('Failed to get a valid Ethereum address');
      }
      
      setAddress(addressString);
      console.log("Set address to:", addressString);
      localStorage.setItem(WALLET_KEY, 'true');
      
      if (provider) {
        try {
          const signerInstance = await provider.getSigner();
          setSigner(signerInstance);
        } catch (error) {
          console.error("Failed to get signer:", error);
        }
      } else {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        try {
          const signerInstance = await web3Provider.getSigner();
          setSigner(signerInstance);
        } catch (error) {
          console.error("Failed to get signer:", error);
        }
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
  
      const betM3Token = new ethers.Contract(
        BET_M3_TOKEN_ADDRESS,
        BetM3TokenABI,
        signer
      );
  
      const uniswapPoolMock = new ethers.Contract(
        UNISWAP_POOL_MOCK_ADDRESS,
        UniswapPoolMockABI,
        signer
      );
  
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
    console.log("Minting CELO tokens...");
    try {
      const userAddress = address || await getUserAddress();
      console.log("Minting for address:", userAddress);
      const { mockCELO } = await getContracts();
      if (!mockCELO) {
        throw new Error("Failed to get MockCELO contract instance");
      }
      const amountWei = ethers.parseEther(amount);
      console.log(`Minting ${amount} CELO (${amountWei.toString()} wei)`);
      const mintTx = await mockCELO.simulateUnstaking(amountWei, {
        gasLimit: 300000
      });
      console.log("Mint transaction sent:", mintTx.hash);
      const mintReceipt = await mintTx.wait();
      console.log("Mint transaction confirmed in block:", mintReceipt.blockNumber);
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
  
  const disconnect = useCallback(() => {
    console.log("Disconnecting wallet...");
    // Clear all wallet-related state
    setAddress(null);
    setSigner(null);
    setProvider(null);
    setIsConnecting(false);
    // Remove from localStorage
    localStorage.removeItem(WALLET_KEY);
    
    // Force UI refresh if needed
    if (typeof window !== 'undefined' && window.ethereum) {
      // Potentially remove any lingering listeners to avoid memory leaks
      try {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', debouncedHandleChainChanged);
      } catch (error) {
        console.error("Error removing listeners during disconnect:", error);
      }
    }
    console.log("Wallet disconnected successfully");
  }, [handleAccountsChanged, debouncedHandleChainChanged]);
  
  const createBet = useCallback(async (
    creatorStake: string,
    opponentStake: string,
    condition: string,
    durationDays: string,
    prediction: boolean
  ): Promise<any> => {
    console.log("Creating bet with parameters:", { creatorStake, opponentStake, condition, durationDays, prediction });
    
    if (isAttemptingConnection) {
      return Promise.reject(new Error("Wallet connection is in progress. Please try again."));
    }

    try {
      const userAddress = await getUserAddress();
      console.log("User address:", userAddress);
      
      if (!signer) {
        throw new Error("No signer available. Please connect your wallet.");
      }

      // First, mint some CELO tokens for testing
      try {
        console.log("Minting CELO tokens for testing...");
        await mintCELO("200");
        console.log("Successfully minted CELO tokens");
      } catch (mintError) {
        console.warn("Could not mint CELO tokens:", mintError);
        // Continue anyway, user might already have tokens
      }

      // The fixed creator stake is 100 CELO in the contract
      const fixedCreatorStake = ethers.parseEther("100");
      const opponentStakeAmountWei = ethers.parseEther(opponentStake);
      
      // Get the CELO token contract
      const celoTokenAddress = getCeloTokenAddress();
      console.log("CELO token address:", celoTokenAddress);
      
      // Check user's balance
      const celoContract = new ethers.Contract(
        celoTokenAddress,
        ["function balanceOf(address owner) view returns (uint256)", 
         "function approve(address spender, uint256 amount) public returns (bool)"],
        signer
      );
      
      const balance = await celoContract.balanceOf(userAddress);
      console.log(`User CELO balance: ${ethers.formatEther(balance)} CELO`);
      
      if (balance < fixedCreatorStake) {
        throw new Error(`Insufficient CELO balance. You need at least 100 CELO to create a bet. Current balance: ${ethers.formatEther(balance)} CELO`);
      }
      
      // Approve the contract to spend tokens
      console.log("Approving CELO transfers for the NoLossBet contract...");
      try {
        const approveTx = await celoContract.approve(NO_LOSS_BET_ADDRESS, fixedCreatorStake, {
          gasLimit: ethers.toBigInt(1000000)
        });
        console.log("Approval transaction sent:", approveTx.hash);
        const approveReceipt = await approveTx.wait();
        console.log("CELO approval confirmed in block:", approveReceipt.blockNumber);
      } catch (approvalError: any) {
        console.error("Error approving CELO transfers:", approvalError);
        throw new Error(`Failed to approve CELO transfers: ${approvalError.message}`);
      }
      
      // Create the bet using the contract
      try {
        console.log("Creating bet with parameters:", {
          creatorStake: fixedCreatorStake.toString(),
          opponentStake: opponentStakeAmountWei.toString(),
          condition,
          tokenURI: ""
        });
        
        // Get the contract instance
        const contract = new ethers.Contract(
          NO_LOSS_BET_ADDRESS,
          NoLossBetABI,
          signer
        );
        
        // Call the contract method with all required parameters
        const tx = await contract.createBet(
          fixedCreatorStake,       // _creatorStake
          opponentStakeAmountWei,  // _opponentStake
          condition,               // _condition
          "",                      // _tokenURI (empty string)
          {
            gasLimit: ethers.toBigInt(5000000)  // Higher gas limit
          }
        );
        
        console.log("Transaction sent:", tx.hash);
        
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt?.blockNumber);
        
        return tx;
      } catch (error: any) {
        console.error("Error creating bet:", error);
        
        // Try to extract more detailed error information
        let errorMessage = error.message || "Unknown error";
        if (error.data) {
          console.error("Error data:", error.data);
        }
        
        throw new Error(`Failed to create bet: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error("Error in createBet:", error);
      throw new Error(`Error creating bet: ${error.message}`);
    }
  }, [signer, getUserAddress, isAttemptingConnection, getCeloTokenAddress, mintCELO]);
  
  const acceptBet = useCallback(async (
    betId: string, 
    prediction: boolean, 
    customStake?: string, 
    commentText?: string
  ): Promise<ethers.ContractTransaction> => {
    if (typeof window === 'undefined') {
      throw new Error("Cannot accept bet in server-side environment");
    }
    if (!signer) throw new Error("Wallet not connected");
    try {
      console.log(`Accepting bet ID ${betId} with prediction: ${prediction}`);
      const contract = getNoLossBetContract();
      const betIdNumber = parseInt(betId);
      try {
        const betDetails = await contract.bets(betIdNumber);
        if (betDetails.creator === "0x0000000000000000000000000000000000000000") {
          throw new Error(`Bet with ID ${betId} does not exist`);
        }
        if (betDetails.opponent !== "0x0000000000000000000000000000000000000000") {
          throw new Error(`Bet with ID ${betId} has already been accepted`);
        }
        if (betDetails.resolved) {
          throw new Error(`Bet with ID ${betId} has already been resolved`);
        }
        if (betDetails.expiration < Math.floor(Date.now() / 1000)) {
          throw new Error(`Bet with ID ${betId} has expired`);
        }
      } catch (betError: any) {
        console.error("Error checking bet details:", betError);
        throw new Error(`Failed to check bet details: ${betError.message}`);
      }
      return await contract.acceptBet(betIdNumber, prediction);
    } catch (error: any) {
      console.error("Error accepting bet:", error);
      throw new Error(`Failed to accept bet: ${error.message}`);
    }
  }, [getNoLossBetContract]);
  
  const getCELOBalance = useCallback(async (address: string | any): Promise<bigint> => {
    try {
      // Log the address to see what's being passed
      console.log(`Getting CELO balance for address:`, address, "type:", typeof address);
      
      // Extract address string if it's an object
      let addressToUse = '';
      
      // Handle null/undefined case
      if (!address) {
        console.error("Null or undefined address provided");
        return BigInt(0);
      }
      
      // If it's already a string that looks like an address
      if (typeof address === 'string' && address.startsWith('0x')) {
        addressToUse = address;
        console.log('Using string address:', addressToUse);
      }
      // If address is an object with an address property (like a signer)
      else if (typeof address === 'object') {
        if ('address' in address && typeof address.address === 'string') {
          addressToUse = address.address;
          console.log('Using address property:', addressToUse);
        } 
        // For objects with toString method
        else if (address.toString && typeof address.toString === 'function') {
          try {
            const stringValue = address.toString();
            // Only use toString result if it looks like an address
            if (stringValue && typeof stringValue === 'string' && stringValue.startsWith('0x')) {
              addressToUse = stringValue;
              console.log('Using toString result:', addressToUse);
            } else {
              console.error('toString did not return a valid address format:', stringValue);
            }
          } catch (e) {
            console.error('Error calling toString on address object:', e);
          }
        } else {
          console.error('Address object does not have address property or toString method:', address);
        }
      } else {
        console.error('Address is not a string or object:', address, typeof address);
      }
      
      // Validate that we have a proper address string
      if (!addressToUse || !addressToUse.startsWith('0x')) {
        console.error('Could not extract valid address from:', address);
        return BigInt(0);
      }
      
      // First check if Hardhat node is running
      let localProvider;
      try {
        localProvider = new ethers.JsonRpcProvider('http://localhost:8545');
        const blockNumber = await localProvider.getBlockNumber();
        console.log(`Connected to Hardhat node, current block: ${blockNumber}`);
      } catch (providerError) {
        console.error("Could not connect to local Hardhat node:", providerError);
        console.log("Returning zero balance as Hardhat node is not available");
        return BigInt(0);
      }
      
      // Check if the contract exists at the specified address
      try {
        const code = await localProvider.getCode(MOCK_CELO_ADDRESS);
        if (code === '0x') {
          console.error(`No contract found at address ${MOCK_CELO_ADDRESS}`);
          console.log("Returning zero balance as contract is not deployed");
          return BigInt(0);
        }
        console.log("Contract exists at specified address");
      } catch (contractError) {
        console.error("Error checking contract code:", contractError);
        return BigInt(0);
      }
      
      // Try to get balance using ethers Contract
      try {
        const mockCELO = new ethers.Contract(
          MOCK_CELO_ADDRESS,
          MockCELOABI,
          localProvider
        );
        
        // Check if the contract has the balanceOf method
        if (typeof mockCELO.balanceOf !== 'function') {
          console.error("Contract does not have balanceOf function");
          return BigInt(0);
        }
        
        try {
          // Ensure the address is properly formatted
          const formattedAddress = ethers.getAddress(addressToUse);
          console.log("Using formatted address:", formattedAddress);
          
          const balance = await mockCELO.balanceOf(formattedAddress);
          console.log(`Balance retrieved successfully: ${balance.toString()}`);
          return balance;
        } catch (addressError) {
          console.error("Error formatting address:", addressError);
          return BigInt(0);
        }
      } catch (balanceError: any) {
        console.error('Error getting balance:', balanceError);
        console.log("Returning zero balance due to error");
        return BigInt(0);
      }
    } catch (err) {
      console.error('Unexpected error in getCELOBalance:', err);
      return BigInt(0);
    }
  }, []);
  
  const getBet = useCallback(async (betId: string): Promise<any> => {
    try {
      const { noLossBet } = await getContracts();
      if (!noLossBet) {
        throw new Error("Contracts not initialized");
      }
      console.log(`Getting bet with ID: ${betId}`);
      const bet = await noLossBet.bets(betId);
      return {
        id: betId,
        creator: bet.creator,
        opponent: bet.opponent,
        amount: bet.creatorStake,
        opponentStake: bet.opponentStake,
        condition: bet.condition,
        creatorOutcome: bet.creatorOutcome,
        opponentOutcome: bet.opponentOutcome,
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
      if (!noLossBet) {
        throw new Error("Contracts not initialized");
      }
      console.log(`Submitting outcome for bet ID: ${betId}, outcome: ${outcome}`);
      const bet = await noLossBet.bets(betId);
      if (bet.resolved) {
        throw new Error("Bet is already resolved");
      }
      if (bet.opponent === ethers.ZeroAddress) {
        throw new Error("Bet has not been accepted yet");
      }
      const tx = await noLossBet.submitOutcome(betId, outcome, {
        gasLimit: 500000
      });
      console.log("Outcome submission transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Outcome submission confirmed in block:", receipt.blockNumber);
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
      if (!noLossBet) {
        throw new Error("Contracts not initialized");
      }
      console.log(`Resolving bet with ID: ${betId}`);
      return { success: true, betId, status: "resolved" };
    } catch (err) {
      console.error('Error resolving bet:', err);
      throw err;
    }
  }, [getContracts]);
  
  const resolveDispute = useCallback(async (betId: string, winner: string): Promise<any> => {
    try {
      const { noLossBet } = await getContracts();
      if (!noLossBet) {
        throw new Error("Contracts not initialized");
      }
      console.log(`Resolving dispute for bet ID: ${betId}, winner: ${winner}`);
      return { success: true, betId, winner };
    } catch (err) {
      console.error('Error resolving dispute:', err);
      throw err;
    }
  }, [getContracts]);
  
  const approveToken = useCallback(async (amount: string): Promise<any> => {
    try {
      const { mockCELO, noLossBet } = await getContracts();
      if (!mockCELO || !noLossBet) {
        throw new Error("Contracts not initialized");
      }
      const amountWei = ethers.parseEther(amount);
      console.log(`Approving ${amount} CELO tokens for the contract...`);
      const tx = await mockCELO.approve(noLossBet.target, amountWei);
      console.log("Approval transaction sent:", tx.hash);
      return tx;
    } catch (err) {
      console.error('Error approving tokens:', err);
      throw err;
    }
  }, [getContracts]);
  
  const getNoLossBetAddress = useCallback((): string => NO_LOSS_BET_ADDRESS, []);
  const getMockCELOAddress = useCallback((): string => MOCK_CELO_ADDRESS, []);
  const getCUSDTokenAddress = useCallback((): string => CUSD_TOKEN_ADDRESS, []);
  const getBetM3TokenAddress = useCallback((): string => BET_M3_TOKEN_ADDRESS, []);
  const getUniswapPoolMockAddress = useCallback((): string => UNISWAP_POOL_MOCK_ADDRESS, []);
  const getLPTokenAddress = useCallback((): string => LP_TOKEN_ADDRESS, []);
  
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
        getCELOBalance,
        getNextBetId,
        mintCELO,
        getNoLossBetAddress,
        getMockCELOAddress,
        getCUSDTokenAddress,
        getBetM3TokenAddress,
        getUniswapPoolMockAddress,
        getLPTokenAddress
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