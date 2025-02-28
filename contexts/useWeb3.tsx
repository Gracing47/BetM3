import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

// Import ABIs using require to avoid TypeScript module resolution issues
const NoLossBetABI = require('../abis/generated/NoLossBetABI.json');
const MockCELOABI = require('../abis/generated/MockCELOABI.json');
const UniswapPoolMockABI = require('../abis/generated/UniswapPoolMockABI.json');
const BetM3TokenABI = require('../abis/generated/BetM3TokenABI.json');
const LPTokenABI = require('../abis/generated/LPTokenABI.json');

// Define global Window interface with ethereum
declare global {
  interface Window {
    ethereum?: any & {
      isMetaMask?: boolean;
      selectedAddress?: string;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

// Contract addresses
interface ContractAddresses {
  noLossBet: string;
  mockCELO: string;
  cUSDToken: string;
  betM3Token: string;
  uniswapPoolMock: string;
  lpToken: string;
}

// Network configuration interface
interface NetworkConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorerUrl?: string;
}

// Load contract addresses from deployment file
const loadContractAddresses = (): ContractAddresses => {
  try {
    // First try to load from the shared location (project root)
    let deploymentInfo;
    try {
      deploymentInfo = require('../../deployment-localhost.json');
      console.log("Loaded contract addresses from shared deployment file");
    } catch (e) {
      // Fallback to local copy for backward compatibility
      try {
        deploymentInfo = require('../deployment-localhost.json');
        console.log("Loaded contract addresses from local deployment file");
      } catch (localError) {
        console.error("Failed to load local deployment file:", localError);
        throw new Error("Could not load deployment files from any location");
      }
    }

    if (!deploymentInfo || !deploymentInfo.addresses) {
      throw new Error("Invalid deployment file format: missing addresses");
    }

    const addresses: ContractAddresses = {
      noLossBet: deploymentInfo.addresses.noLossBet,
      mockCELO: deploymentInfo.addresses.mockCELO || deploymentInfo.addresses.celoToken,
      cUSDToken: deploymentInfo.addresses.cUSDToken,
      betM3Token: deploymentInfo.addresses.betM3Token,
      uniswapPoolMock: deploymentInfo.addresses.uniswapPoolMock,
      lpToken: deploymentInfo.addresses.lpToken
    };

    // Validate that all required addresses are present
    Object.entries(addresses).forEach(([key, value]) => {
      if (!value) {
        throw new Error(`Missing required contract address: ${key}`);
      }
    });

    console.log("Contract addresses loaded successfully:", addresses);
    return addresses;
  } catch (error) {
    console.error("Error loading contract addresses:", error);
    throw new Error("Failed to load contract addresses. Please ensure deployment files are correctly generated.");
  }
};

// Network configuration
const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  hardhat: {
    chainId: '0x7a69', // 31337 in hex
    name: 'Hardhat Local Network',
    rpcUrl: 'http://localhost:8545'
  },
  celoTestnet: {
    chainId: '0xaef3', // 44787 in hex
    name: 'Celo Alfajores Testnet',
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    blockExplorerUrl: 'https://alfajores.celoscan.io/'
  },
  celoMainnet: {
    chainId: '0xa4ec', // 42220 in hex
    name: 'Celo Mainnet',
    rpcUrl: 'https://forno.celo.org',
    blockExplorerUrl: 'https://celoscan.io/'
  }
};

// Web3 Context Type
export interface Web3ContextType {
  // Connection state
  address: string | null;
  isConnecting: boolean;
  networkName: string;
  
  // Connection methods
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  switchToHardhat: () => Promise<void>;
  switchToCeloTestnet: () => Promise<void>;
  switchToCeloMainnet: () => Promise<void>;
  
  // Contract interaction methods
  getUserAddress: () => Promise<string>;
  getCELOBalance: () => Promise<string>;
  getNextBetId: () => Promise<number>;
  createBet: (
    description: string,
    endTime: number,
    creatorStake: string
  ) => Promise<ethers.ContractTransaction>;
  acceptBet: (
    betId: string, 
    prediction: boolean, 
    customStake?: string
  ) => Promise<ethers.ContractTransaction>;
  getBets: () => Promise<any[]>;
  
  // Contract address getters
  getNoLossBetAddress: () => string;
  getMockCELOAddress: () => string;
  getCUSDTokenAddress: () => string;
  getBetM3TokenAddress: () => string;
  getUniswapPoolMockAddress: () => string;
  getLPTokenAddress: () => string;
}

// Create the Web3 Context
const Web3Context = createContext<Web3ContextType | null>(null);

// Web3 Provider Component
export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // If we're not in a browser environment, render only children
  if (!isBrowser) {
    // Create a dummy context value for server-side rendering
    const dummyContextValue: Web3ContextType = {
      address: null,
      isConnecting: false,
      networkName: '',
      connectWallet: async () => {},
      disconnect: () => {},
      switchToHardhat: async () => {},
      switchToCeloTestnet: async () => {},
      switchToCeloMainnet: async () => {},
      getUserAddress: async () => '',
      getCELOBalance: async () => '0',
      getNextBetId: async () => 0,
      createBet: async () => { throw new Error('Not available server-side') },
      acceptBet: async () => { throw new Error('Not available server-side') },
      getBets: async () => [],
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
  
  // Load contract addresses
  let contractAddresses;
  try {
    contractAddresses = loadContractAddresses();
  } catch (error) {
    console.error("Error loading contract addresses:", error);
    // Provide default empty addresses for server-side rendering
    contractAddresses = {
      noLossBet: '',
      mockCELO: '',
      cUSDToken: '',
      betM3Token: '',
      uniswapPoolMock: '',
      lpToken: ''
    };
  }
  
  // State
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [networkName, setNetworkName] = useState<string>('');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner | null>(null);
  
  // Initialize provider and check connection
  useEffect(() => {
    // Skip initialization on server-side
    if (!isBrowser) return;
    
    const initProvider = async () => {
      if (window.ethereum) {
        try {
          const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(web3Provider);
          
          // Check if already connected
          const accounts = await web3Provider.listAccounts();
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            setSigner(web3Provider.getSigner());
          }
          
          // Get network name
          const network = await web3Provider.getNetwork();
          updateNetworkName(network.chainId.toString(16));
          
          // Listen for account changes
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', handleChainChanged);
          
          return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum?.removeListener('chainChanged', handleChainChanged);
          };
        } catch (error) {
          console.error("Failed to initialize provider:", error);
        }
      } else {
        console.warn("No ethereum object found. Please install MetaMask.");
      }
    };
    
    initProvider();
  }, [isBrowser]);
  
  // Handle account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      setAddress(null);
      setSigner(null);
    } else {
      // User switched accounts
      setAddress(accounts[0]);
      if (provider) {
        setSigner(provider.getSigner());
      }
    }
  };
  
  // Handle chain changes
  const handleChainChanged = (chainIdHex: string) => {
    // Reload the page on chain change as recommended by MetaMask
    window.location.reload();
  };
  
  // Update network name based on chainId
  const updateNetworkName = (chainIdHex: string) => {
    if (chainIdHex === NETWORK_CONFIG.hardhat.chainId) {
      setNetworkName('Hardhat');
    } else if (chainIdHex === NETWORK_CONFIG.celoTestnet.chainId) {
      setNetworkName('Celo Testnet');
    } else if (chainIdHex === NETWORK_CONFIG.celoMainnet.chainId) {
      setNetworkName('Celo Mainnet');
    } else {
      setNetworkName('Unknown Network');
    }
  };
  
  // Connect wallet
  const connectWallet = useCallback(async () => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn("Cannot connect wallet in server-side environment");
      return;
    }
    
    if (!window.ethereum) {
      alert("Please install MetaMask to use this application.");
      return;
    }
    
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        if (provider) {
          setSigner(provider.getSigner());
        }
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);
  
  // Disconnect wallet (for UI purposes only)
  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
  }, []);
  
  // Switch network functions
  const switchNetwork = async (networkConfig: NetworkConfig) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    if (!window.ethereum) return;
    
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: networkConfig.chainId }]
      });
    } catch (error: any) {
      // If the network is not added to MetaMask, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: networkConfig.chainId,
              chainName: networkConfig.name,
              rpcUrls: [networkConfig.rpcUrl],
              nativeCurrency: {
                name: 'CELO',
                symbol: 'CELO',
                decimals: 18
              },
              blockExplorerUrls: networkConfig.blockExplorerUrl ? [networkConfig.blockExplorerUrl] : undefined
            }]
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
        }
      } else {
        console.error("Failed to switch network:", error);
      }
    }
  };
  
  const switchToHardhat = useCallback(async () => {
    await switchNetwork(NETWORK_CONFIG.hardhat);
  }, []);
  
  const switchToCeloTestnet = useCallback(async () => {
    await switchNetwork(NETWORK_CONFIG.celoTestnet);
  }, []);
  
  const switchToCeloMainnet = useCallback(async () => {
    await switchNetwork(NETWORK_CONFIG.celoMainnet);
  }, []);
  
  // Get user address
  const getUserAddress = useCallback(async (): Promise<string> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return '';
    }
    
    if (address) return address;
    
    if (provider) {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        return accounts[0];
      }
    }
    
    throw new Error("No connected account found");
  }, [address, provider]);
  
  // Get CELO balance
  const getCELOBalance = useCallback(async (): Promise<string> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return "0";
    }
    
    if (!provider || !address) return "0";
    
    try {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("Failed to get CELO balance:", error);
      return "0";
    }
  }, [provider, address]);
  
  // Get NoLossBet contract instance
  const getNoLossBetContract = useCallback(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error("Cannot get contract in server-side environment");
    }
    
    if (!provider) throw new Error("Provider not initialized");
    
    return new ethers.Contract(
      contractAddresses.noLossBet,
      NoLossBetABI,
      signer || provider
    );
  }, [provider, signer, contractAddresses.noLossBet]);
  
  // Get next bet ID
  const getNextBetId = useCallback(async (): Promise<number> => {
    // Check if we're in a browser environment
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
  
  // Create a new bet
  const createBet = useCallback(async (
    description: string,
    endTime: number,
    creatorStake: string
  ): Promise<ethers.ContractTransaction> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error("Cannot create bet in server-side environment");
    }
    
    if (!signer) throw new Error("Wallet not connected");
    
    const contract = getNoLossBetContract();
    const stakeAmount = ethers.utils.parseEther(creatorStake);
    
    return await contract.createBet(description, endTime, stakeAmount);
  }, [signer, getNoLossBetContract]);
  
  // Approve tokens
  const approveToken = useCallback(async (amount: string): Promise<any> => {
    try {
      const { mockCELO } = await getContracts();
      if (!mockCELO) throw new Error("MockCELO contract not initialized");
      
      // Ensure we have a valid target address
      const targetAddress = NO_LOSS_BET_ADDRESS;
      
      console.log(`Approving ${amount} tokens for ${targetAddress}`);
      const amountWei = ethers.parseEther(amount);
      
      // First try to reset approval to 0 to avoid some token approval issues
      const resetTx = await mockCELO.approve(targetAddress, 0, {
        gasLimit: 100000
      });
      await resetTx.wait();
      console.log("Reset approval to 0 confirmed");
      
      // Now approve the requested amount
      const tx = await mockCELO.approve(targetAddress, amountWei, {
        gasLimit: 200000
      });
      await tx.wait();
      console.log(`Approval transaction confirmed for ${amount} tokens`);
      
      // Verify the approval was successful
      if (address) {
        const newAllowance = await mockCELO.allowance(address, targetAddress);
        console.log(`Verified allowance: ${ethers.formatEther(newAllowance)}`);
        
        // If allowance is still insufficient, try direct approval with the exact amount in wei
        if (newAllowance < amountWei) {
          console.log("Allowance verification failed. Trying direct approval with exact amount in wei...");
          const exactTx = await mockCELO.approve(targetAddress, amountWei.toString(), {
            gasLimit: 300000
          });
          await exactTx.wait();
          console.log("Direct approval confirmed");
          
          const finalAllowance = await mockCELO.allowance(address, targetAddress);
          console.log(`Final allowance: ${ethers.formatEther(finalAllowance)}`);
          
          if (finalAllowance < amountWei) {
            throw new Error(`Cannot set sufficient allowance: got ${finalAllowance}, needed ${amountWei}`);
          }
        }
      }
      
      return tx;
    } catch (err) {
      console.error('Error approving tokens:', err);
      throw err;
    }
  }, [getContracts, address]);
  
  // Accept a bet
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

    console.log(`Attempting to accept bet: betId=${betId}, prediction=${prediction}, customStake=${customStake || 'default'}`);

    try {
      const noLossBetAddress = getNoLossBetAddress();
      
      // Get contract instances
      const contracts = await getContracts();
      if (!contracts.mockCELO) throw new Error("MockCELO contract not initialized");
      
      const targetAddress = NO_LOSS_BET_ADDRESS;
      console.log("Target address for contract:", targetAddress);
      
      // Create ethers provider with debugging options
      const provider = new ethers.BrowserProvider(window.ethereum, undefined, {
        batchStallTime: 0 // Reduce wait time for logs
      });
      
      // Try to get a wallet with debugging enabled
      const debugSigner = await provider.getSigner();
      
      // Create a more detailed contract instance
      const contract = new ethers.Contract(
        targetAddress,
        NoLossBetABI,
        debugSigner
      );
      
      const betIdNumber = parseInt(betId);

      // Attempt with lower stakes to rule out token amount issues
      const lowerStake = "1"; // Try with just 1 token
      const stakeAmountWei = ethers.parseEther(lowerStake);
      
      console.log(`Using minimal stake amount for debugging: ${lowerStake} (${stakeAmountWei.toString()})`);
      
      // Ensure allowance is sufficient
      const currentAllowance = await contracts.mockCELO.allowance(address, targetAddress);
      console.log(`Current allowance: ${ethers.formatEther(currentAllowance)}`);
      
      if (currentAllowance < stakeAmountWei) {
        const approveTx = await contracts.mockCELO.approve(targetAddress, stakeAmountWei, {
          gasLimit: 200000
        });
        console.log(`Waiting for approval transaction: ${approveTx.hash}`);
        await approveTx.wait();
        console.log("Approval confirmed");
      }
      
      // Try a minimal gas estimation approach first
      try {
        console.log("Estimating gas for the transaction...");
        const gasEstimate = await contract.acceptBet.estimateGas(
          betIdNumber, 
          prediction, 
          stakeAmountWei,
          { from: address }
        );
        
        console.log(`Gas estimate: ${gasEstimate.toString()}`);
        
        // Add 50% buffer to the estimate
        const gasLimit = gasEstimate.mul(150).div(100);
        console.log(`Using gas limit with buffer: ${gasLimit.toString()}`);
        
        // Try the transaction with the calculated gas limit
        console.log(`Calling acceptBet with betId=${betIdNumber}, prediction=${prediction}, stake=${stakeAmountWei.toString()}`);
        const tx = await contract.acceptBet(betIdNumber, prediction, stakeAmountWei, {
          gasLimit
        });
        
        console.log(`Transaction submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Bet accepted in block ${receipt.blockNumber}`);
        return tx;
      } catch (estimateError) {
        console.error("Gas estimation failed, this is important debugging information:", estimateError);
        
        // If gas estimation fails, let's try different parameter combinations
        try {
          console.log("Trying alternative parameter settings...");
          
          // Attempt 1: Try with a zero stake amount
          console.log("Attempt 1: Using zero stake amount");
          const tx1 = await contract.acceptBet(betIdNumber, prediction, 0, {
            gasLimit: 2000000
          });
          
          console.log(`Transaction submitted: ${tx1.hash}`);
          const receipt1 = await tx1.wait();
          console.log(`Bet accepted in block ${receipt1.blockNumber}`);
          return tx1;
        } catch (error1) {
          console.error("Attempt 1 failed:", error1);
          
          // Attempt 2: Try with different parameter order
          try {
            console.log("Attempt 2: Using different parameter arrangement");
            // Create calldata directly
            const ABI = ["function acceptBet(uint256 betId, bool prediction, uint256 customStake)"];
            const iface = new ethers.Interface(ABI);
            const calldata = iface.encodeFunctionData("acceptBet", [
              betIdNumber, prediction, stakeAmountWei
            ]);
            
            // Send a raw transaction
            const tx2 = await debugSigner.sendTransaction({
              to: targetAddress,
              data: calldata,
              gasLimit: 3000000
            });
            
            console.log(`Transaction submitted: ${tx2.hash}`);
            const receipt2 = await tx2.wait();
            console.log(`Bet accepted in block ${receipt2.blockNumber}`);
            return tx2;
          } catch (error2) {
            console.error("Attempt 2 failed:", error2);
            
            // Attempt 3: Try a completely different approach - call without the customStake parameter
            try {
              console.log("Attempt 3: Simplest possible call");
              // Create specialized interface
              const SimplifiedABI = ["function acceptBet(uint256 betId, bool prediction)"];
              const simplifiedInterface = new ethers.Interface(SimplifiedABI);
              const simpleCalldata = simplifiedInterface.encodeFunctionData("acceptBet", [
                betIdNumber, prediction
              ]);
              
              const tx3 = await debugSigner.sendTransaction({
                to: targetAddress,
                data: simpleCalldata,
                gasLimit: 5000000
              });
              
              console.log(`Transaction submitted: ${tx3.hash}`);
              const receipt3 = await tx3.wait();
              console.log(`Bet accepted in block ${receipt3.blockNumber}`);
              return tx3;
            } catch (error3) {
              console.error("All attempts failed. Contract might have fundamental issues:", error3);
              
              // Log very detailed debugging information
              console.log("Contract address:", targetAddress);
              console.log("Sender address:", address);
              console.log("BetId:", betIdNumber);
              console.log("Prediction:", prediction);
              console.log("Stake amount:", ethers.formatEther(stakeAmountWei));
              
              // Retrieve additional contract information if possible
              try {
                const owner = await contract.owner();
                console.log("Contract owner:", owner);
              } catch (e) {
                console.log("Could not retrieve contract owner");
              }
              
              throw new Error("Contract interaction failed after multiple attempts. The smart contract might have logic issues or be incompatible with current parameters.");
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error accepting bet:", error);
      throw new Error(`Failed to accept bet: ${error.message}`);
    }
  }, [getNoLossBetAddress, getContracts, signer, address]);
  
  // Bet interface for type safety
  interface Bet {
    id: number;
    [key: string]: any; // Allow any additional properties from the contract
  }

  // Get all bets
  const getBets = useCallback(async (): Promise<Bet[]> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return [];
    }
    
    try {
      const contract = getNoLossBetContract();
      const nextBetId = await contract.nextBetId();
      const bets: Bet[] = [];
      
      for (let i = 0; i < Number(nextBetId); i++) {
        try {
          const bet = await contract.bets(i);
          bets.push({
            id: i,
            ...Object.fromEntries(
              Object.entries(bet).filter(([key]) => isNaN(Number(key)))
            )
          });
        } catch (error) {
          console.error(`Failed to fetch bet ${i}:`, error);
        }
      }
      
      return bets;
    } catch (error) {
      console.error("Failed to get bets:", error);
      return [];
    }
  }, [getNoLossBetContract]);
  
  // Contract address getters
  const getNoLossBetAddress = useCallback(() => contractAddresses.noLossBet, [contractAddresses]);
  const getMockCELOAddress = useCallback(() => contractAddresses.mockCELO, [contractAddresses]);
  const getCUSDTokenAddress = useCallback(() => contractAddresses.cUSDToken, [contractAddresses]);
  const getBetM3TokenAddress = useCallback(() => contractAddresses.betM3Token, [contractAddresses]);
  const getUniswapPoolMockAddress = useCallback(() => contractAddresses.uniswapPoolMock, [contractAddresses]);
  const getLPTokenAddress = useCallback(() => contractAddresses.lpToken, [contractAddresses]);
  
  // Provide the context value
  const contextValue: Web3ContextType = {
    address,
    isConnecting,
    networkName,
    connectWallet,
    disconnect,
    switchToHardhat,
    switchToCeloTestnet,
    switchToCeloMainnet,
    getUserAddress,
    getCELOBalance,
    getNextBetId,
    createBet,
    acceptBet,
    getBets,
    getNoLossBetAddress,
    getMockCELOAddress,
    getCUSDTokenAddress,
    getBetM3TokenAddress,
    getUniswapPoolMockAddress,
    getLPTokenAddress
  };
  
  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

// Custom hook to use the Web3 context
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === null) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}; 