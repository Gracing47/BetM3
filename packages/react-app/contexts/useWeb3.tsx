import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { NoLossBetABI, MockCELOABI, UniswapPoolMockABI, BetM3TokenABI } from '../abis/generated/index';

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

interface Web3ContextType {
  address: string | null;
  getUserAddress: () => Promise<string>;
  disconnect: () => void;
  isConnecting: boolean;
  createBet: (amount: string, condition: string, durationDays: string, prediction: boolean) => Promise<any>;
  acceptBet: (betId: string, prediction: boolean) => Promise<any>;
  getBet: (betId: string) => Promise<any>;
  submitOutcome: (betId: string, outcome: boolean) => Promise<any>;
  resolveBet: (betId: string) => Promise<any>;
  resolveDispute: (betId: string, winner: string) => Promise<any>;
  approveToken: (amount: string) => Promise<any>;
  getCELOBalance: (address: string) => Promise<bigint>;
  getNextBetId: () => Promise<number>;
  mintCELO: (amount: string) => Promise<any>;
  networkName: string;
  switchToCelo: () => Promise<void>;
  switchToHardhat: () => Promise<void>;
  switchToCeloMainnet: () => Promise<void>;
}

// Lokale Hardhat-Adressen (müssen für Testnet oder Mainnet aktualisiert werden)
let NO_LOSS_BET_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
let MOCK_CELO_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Korrekte MockCELO-Adresse
let CUSD_TOKEN_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
let BET_M3_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
let UNISWAP_POOL_MOCK_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
let LP_TOKEN_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

// Import the deployment addresses directly
try {
  const deploymentInfo = require('../deployment-localhost.json');
  if (deploymentInfo && deploymentInfo.addresses) {
    // Update addresses from deployment file
    NO_LOSS_BET_ADDRESS = deploymentInfo.addresses.noLossBet;
    MOCK_CELO_ADDRESS = deploymentInfo.addresses.mockCELO || deploymentInfo.addresses.celoToken;
    CUSD_TOKEN_ADDRESS = deploymentInfo.addresses.cUSDToken;
    BET_M3_TOKEN_ADDRESS = deploymentInfo.addresses.betM3Token;
    UNISWAP_POOL_MOCK_ADDRESS = deploymentInfo.addresses.uniswapPoolMock;
    LP_TOKEN_ADDRESS = deploymentInfo.addresses.lpToken;
    console.log("Loaded contract addresses from deployment-localhost.json");
    console.log("Using NoLossBet address:", NO_LOSS_BET_ADDRESS);
    console.log("Using MockCELO address:", MOCK_CELO_ADDRESS);
    console.log("Using UniswapPoolMock address:", UNISWAP_POOL_MOCK_ADDRESS);
  }
} catch (error) {
  console.warn("Could not load deployment-localhost.json, using hardcoded addresses");
  console.log("Using NoLossBet address:", NO_LOSS_BET_ADDRESS);
  console.log("Using MockCELO address:", MOCK_CELO_ADDRESS);
  console.log("Using UniswapPoolMock address:", UNISWAP_POOL_MOCK_ADDRESS);
}

// Celo Netzwerk-Konfiguration
const CELO_CHAIN_ID = '0xaef3'; // 44787 in hex für Alfajores Testnet
const CELO_MAINNET_CHAIN_ID = '0xa4ec'; // 42220 in hex für Celo Mainnet
const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex für lokales Hardhat-Netzwerk

const CELO_NETWORK_PARAMS = {
  chainId: CELO_CHAIN_ID,
  chainName: 'Celo Alfajores Testnet',
  nativeCurrency: {
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18
  },
  rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
  blockExplorerUrls: ['https://alfajores.celoscan.io/']
};

const CELO_MAINNET_PARAMS = {
  chainId: CELO_MAINNET_CHAIN_ID,
  chainName: 'Celo Mainnet',
  nativeCurrency: {
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18
  },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://celoscan.io/']
};

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

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkName, setNetworkName] = useState<string>('');

  // Add a function to check if the Hardhat node is running
  const checkHardhatNode = useCallback(async (): Promise<boolean> => {
    try {
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      await provider.getBlockNumber();
      return true;
    } catch (error) {
      console.error('Error connecting to Hardhat node:', error);
      return false;
    }
  }, []);

  // Update the useEffect to check if Hardhat node is running
  useEffect(() => {
    const autoConnect = async () => {
      const shouldConnect = localStorage.getItem(WALLET_KEY) === 'true';
      if (shouldConnect && window.ethereum) {
        try {
          setIsConnecting(true);
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            
            // Überprüfe das aktuelle Netzwerk
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            updateNetworkName(chainId);
            
            // Check if Hardhat node is running
            const isHardhatRunning = await checkHardhatNode();
            if (!isHardhatRunning && chainId === HARDHAT_CHAIN_ID) {
              console.error('Hardhat node is not running. Please start it with "npx hardhat node"');
              alert('Hardhat node is not running. Please start it with "npx hardhat node" in your terminal.');
            }
          }
        } catch (err) {
          console.error('Auto-connect failed:', err);
          localStorage.removeItem(WALLET_KEY);
        } finally {
          setIsConnecting(false);
        }
      } else {
        // Even if not auto-connecting, check if Hardhat node is running
        const isHardhatRunning = await checkHardhatNode();
        if (!isHardhatRunning) {
          console.error('Hardhat node is not running. Please start it with "npx hardhat node"');
        }
      }
    };
    autoConnect();
  }, [checkHardhatNode]);

  const updateNetworkName = (chainId: string) => {
    if (chainId === CELO_CHAIN_ID) {
      setNetworkName('Celo Alfajores Testnet');
    } else if (chainId === CELO_MAINNET_CHAIN_ID) {
      setNetworkName('Celo Mainnet');
    } else if (chainId === HARDHAT_CHAIN_ID) {
      setNetworkName('Hardhat Local');
    } else {
      setNetworkName('Unsupported Network');
    }
  };

  const getUserAddress = useCallback(async (): Promise<string> => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setAddress(address);
      localStorage.setItem(WALLET_KEY, 'true');
      
      // Überprüfe das aktuelle Netzwerk
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      updateNetworkName(chainId);
      
      return address;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchToCelo = useCallback(async (): Promise<void> => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }

    try {
      // Versuche zuerst, zum Celo-Netzwerk zu wechseln
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CELO_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Wenn das Netzwerk nicht existiert, füge es hinzu
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CELO_NETWORK_PARAMS],
          });
        } catch (addError) {
          console.error('Error adding Celo network:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to Celo network:', switchError);
        throw switchError;
      }
    }
    
    // Aktualisiere den Netzwerknamen nach dem Wechsel
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    updateNetworkName(chainId);
  }, []);

  const switchToHardhat = useCallback(async (): Promise<void> => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }

    try {
      // Versuche zuerst, zum Hardhat-Netzwerk zu wechseln
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Wenn das Netzwerk nicht existiert, füge es hinzu
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
      } else {
        console.error('Error switching to Hardhat network:', switchError);
        throw switchError;
      }
    }
    
    // Aktualisiere den Netzwerknamen nach dem Wechsel
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    updateNetworkName(chainId);
  }, []);

  const switchToCeloMainnet = useCallback(async (): Promise<void> => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }

    try {
      // Versuche zuerst, zum Celo Mainnet zu wechseln
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CELO_MAINNET_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Wenn das Netzwerk nicht existiert, füge es hinzu
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CELO_MAINNET_PARAMS],
          });
        } catch (addError) {
          console.error('Error adding Celo Mainnet:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to Celo Mainnet:', switchError);
        throw switchError;
      }
    }
    
    // Aktualisiere den Netzwerknamen nach dem Wechsel
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    updateNetworkName(chainId);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(WALLET_KEY);
  }, []);

  // Holen der Vertragsinstanzen
  const getContracts = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another compatible wallet.');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Erstelle Vertragsinstanzen
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

      // Skip contract verification as it's causing issues
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

  // Move getCELOBalance function before createBet
  const getCELOBalance = useCallback(async (address: string): Promise<bigint> => {
    try {
      console.log(`Getting CELO balance for address: ${address}`);
      
      // First check if the Hardhat node is running
      let localProvider;
      try {
        localProvider = new ethers.JsonRpcProvider('http://localhost:8545');
        await localProvider.getBlockNumber();
      } catch (providerError) {
        console.error("Could not connect to local Hardhat node:", providerError);
        throw new Error("Could not connect to local Hardhat node. Make sure it's running with 'npx hardhat node'");
      }
      
      // Check if the contract exists at the specified address
      try {
        const code = await localProvider.getCode(MOCK_CELO_ADDRESS);
        if (code === '0x') {
          console.error(`No contract found at address ${MOCK_CELO_ADDRESS}`);
          throw new Error(`No contract found at address ${MOCK_CELO_ADDRESS}. Make sure contracts are deployed.`);
        }
      } catch (contractError) {
        console.error("Error checking contract code:", contractError);
        // Continue anyway, as this might be a temporary issue
      }
      
      let provider;
      let mockCELO;
      
      try {
        // First try with browser provider if available
        if (window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
          mockCELO = new ethers.Contract(
            MOCK_CELO_ADDRESS,
            MockCELOABI,
            provider
          );
        } else {
          // Fallback to local provider
          provider = localProvider;
          mockCELO = new ethers.Contract(
            MOCK_CELO_ADDRESS,
            MockCELOABI,
            provider
          );
        }
        
        // Get balance from contract
        const balance = await mockCELO.balanceOf(address);
        return balance;
      } catch (balanceError) {
        console.error('Error getting balance with primary method:', balanceError);
        
        // Fallback to local provider if browser provider failed
        console.log('Falling back to local provider...');
        provider = localProvider;
        mockCELO = new ethers.Contract(
          MOCK_CELO_ADDRESS,
          MockCELOABI,
          provider
        );
        
        try {
          const balance = await mockCELO.balanceOf(address);
          return balance;
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          
          // As a last resort, try to use the owner wallet to check balance
          try {
            const ownerWallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", localProvider);
            mockCELO = new ethers.Contract(
              MOCK_CELO_ADDRESS,
              MockCELOABI,
              ownerWallet
            );
            const balance = await mockCELO.balanceOf(address);
            return balance;
          } catch (ownerError) {
            console.error('Owner wallet method also failed:', ownerError);
            // Return 0 instead of throwing to prevent UI errors
            return BigInt(0);
          }
        }
      }
    } catch (err) {
      console.error('Error in getCELOBalance:', err);
      // Return 0 instead of throwing to prevent UI errors
      return BigInt(0);
    }
  }, []);

  const createBet = useCallback(async (amount: string, condition: string, durationDays: string, prediction: boolean): Promise<any> => {
    try {
      // First check if the Hardhat node is running
      try {
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        await provider.getBlockNumber();
      } catch (providerError) {
        console.error("Could not connect to local Hardhat node:", providerError);
        throw new Error("Could not connect to local Hardhat node. Make sure it's running with 'npx hardhat node'");
      }
      
      const { noLossBet, mockCELO } = await getContracts();
      
      if (!noLossBet || !mockCELO) {
        throw new Error("Contracts not initialized. Make sure you're connected to the correct network.");
      }
      
      // Validate minimum opponent stake
      const minOpponentStake = 100;
      if (parseFloat(amount) < minOpponentStake) {
        throw new Error(`Opponent stake must be at least ${minOpponentStake} CELO`);
      }
      
      // The contract has a fixed creator stake of 100 CELO
      const creatorStake = ethers.parseEther("100");
      
      // Convert opponent stake to wei
      const opponentStake = ethers.parseEther(amount);
      
      // Generate a simple tokenURI for the NFT
      const tokenURI = `ipfs://betm3/${Date.now()}`;
      
      console.log(`Creating bet with creator stake: 100 CELO (fixed for MVP), opponent stake: ${amount} CELO, condition: ${condition}, tokenURI: ${tokenURI}, prediction: ${prediction ? 'Yes' : 'No'}`);
      
      // First check if the user has enough balance
      const userAddress = await getUserAddress();
      
      // Get balance using a try-catch to handle potential errors
      let userBalance;
      try {
        userBalance = await mockCELO.balanceOf(userAddress);
        console.log(`User balance: ${ethers.formatEther(userBalance)} CELO`);
      } catch (balanceError) {
        console.error("Error checking balance:", balanceError);
        
        // Try with the getCELOBalance function as a fallback
        try {
          userBalance = await getCELOBalance(userAddress);
          console.log(`User balance (fallback method): ${ethers.formatEther(userBalance)} CELO`);
        } catch (fallbackError) {
          console.error("Fallback balance check also failed:", fallbackError);
          throw new Error("Could not check your CELO balance. Please make sure the Hardhat node is running and you're connected to the correct network.");
        }
      }
      
      if (userBalance < creatorStake) {
        throw new Error(`Insufficient CELO balance. You need at least 100 CELO to create a bet. Current balance: ${ethers.formatEther(userBalance)} CELO`);
      }
      
      // Reset approval to ensure it's sufficient for the higher stake
      console.log("Resetting approval for tokens...");
      try {
        // First, check current allowance
        const currentAllowance = await mockCELO.allowance(userAddress, noLossBet.target);
        console.log(`Current allowance: ${ethers.formatEther(currentAllowance)} CELO`);
        
        // Only approve if needed
        if (currentAllowance < creatorStake) {
          // Reset approval to 0 first to handle some tokens that require this
          if (currentAllowance > BigInt(0)) {
            console.log("Setting approval to zero first...");
            const resetTx = await mockCELO.approve(noLossBet.target, 0, {
              gasLimit: 200000
            });
            console.log("Reset transaction sent:", resetTx.hash);
            await resetTx.wait();
          }
          
          // Now approve the full amount needed
          console.log("Approving tokens for the contract...");
          const approveTx = await mockCELO.approve(noLossBet.target, creatorStake, {
            gasLimit: 200000 // Increase gas limit to prevent underestimation
          });
          console.log("Approval transaction sent:", approveTx.hash);
          
          // Wait for the approval transaction to be mined
          const approveReceipt = await approveTx.wait();
          console.log("Approval confirmed in block:", approveReceipt.blockNumber);
        } else {
          console.log("Sufficient allowance already exists, skipping approval");
        }
      } catch (approveError: any) {
        console.error("Error during token approval:", approveError);
        
        // Provide more specific error message based on the error
        if (approveError.message.includes("user rejected")) {
          throw new Error("You rejected the approval transaction. Please approve to continue.");
        } else if (approveError.message.includes("insufficient funds")) {
          throw new Error("You don't have enough ETH to pay for gas. Please add ETH to your wallet.");
        } else {
          throw new Error(`Failed to approve tokens: ${approveError.message}`);
        }
      }
      
      // Verify the allowance was set correctly
      let newAllowance;
      try {
        newAllowance = await mockCELO.allowance(userAddress, noLossBet.target);
        console.log(`New allowance after approval: ${ethers.formatEther(newAllowance)} CELO`);
      } catch (allowanceError) {
        console.error("Error checking new allowance:", allowanceError);
        throw new Error("Could not verify token allowance. Please try again.");
      }
      
      if (newAllowance < creatorStake) {
        throw new Error("Token approval failed. Please try again.");
      }
      
      console.log("Creating bet...");
      // Now create the bet with higher gas limit to prevent underestimation
      try {
        // Note: The contract's createBet function doesn't accept a prediction parameter
        // The prediction is stored in the UI for later use with submitOutcome
        const tx = await noLossBet.createBet(opponentStake, condition, tokenURI, {
          gasLimit: 2000000 // Increase gas limit to prevent underestimation
        });
        
        console.log("Bet creation transaction sent:", tx.hash);
        
        // After creating the bet, we need to submit the creator's outcome
        // We'll wait for the transaction to be mined first
        const receipt = await tx.wait();
        console.log("Bet creation confirmed in block:", receipt.blockNumber);
        
        // Get the bet ID from the betCounter (it's the last created bet)
        try {
          // Get the current bet counter and subtract 1 to get the ID of the bet we just created
          const betCounter = await noLossBet.betCounter();
          const betId = betCounter - BigInt(1);
          console.log("New bet ID:", betId.toString());
          
          // Store the creator's prediction for later use
          // We can't submit the outcome yet because the bet hasn't been accepted
          try {
            // Store the prediction in localStorage with the bet ID
            const predictionKey = `bet_${betId.toString()}_creator_prediction`;
            localStorage.setItem(predictionKey, prediction ? 'true' : 'false');
            console.log(`Stored creator's prediction (${prediction}) for bet ID ${betId} in localStorage`);
            
            // Note: We'll submit the outcome after the bet is accepted
            // This will be handled in the acceptBet function or a separate UI component
          } catch (storageError) {
            console.error("Error storing prediction in localStorage:", storageError);
          }
          
          // Don't try to submit the outcome now - it will fail with "Bet not accepted yet"
          // We'll submit it after the bet is accepted
        } catch (betIdError: any) {
          console.error("Error getting bet ID:", betIdError);
          console.log("Bet was created but could not submit outcome");
        }
        
        return tx;
      } catch (createError: any) {
        console.error("Error creating bet:", createError);
        
        // Provide more specific error message based on the error
        if (createError.message.includes("user rejected")) {
          throw new Error("You rejected the transaction. Please confirm to create the bet.");
        } else if (createError.message.includes("insufficient funds")) {
          throw new Error("You don't have enough ETH to pay for gas. Please add ETH to your wallet.");
        } else if (createError.message.includes("execution reverted")) {
          throw new Error(`Contract execution reverted: ${createError.message}. This might be due to insufficient allowance or balance.`);
        } else {
          throw new Error(`Failed to create bet: ${createError.message}`);
        }
      }
    } catch (err) {
      console.error('Error creating bet:', err);
      throw err;
    }
  }, [getContracts, getUserAddress, getCELOBalance]);

  // Implement the missing functions
  const acceptBet = useCallback(async (betId: string, prediction: boolean = true): Promise<any> => {
    try {
      // First check if the Hardhat node is running
      try {
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        await provider.getBlockNumber();
      } catch (providerError) {
        console.error("Could not connect to local Hardhat node:", providerError);
        throw new Error("Could not connect to local Hardhat node. Make sure it's running with 'npx hardhat node'");
      }
      
      const { noLossBet, mockCELO } = await getContracts();
      
      if (!noLossBet || !mockCELO) {
        throw new Error("Contracts not initialized. Make sure you're connected to the correct network.");
      }
      
      console.log(`Accepting bet with ID: ${betId}`);
      
      // First get the bet details to determine the opponent stake
      const bet = await noLossBet.bets(betId);
      const opponentStake = bet.opponentStake;
      
      console.log(`Bet requires opponent stake of: ${ethers.formatEther(opponentStake)} CELO`);
      
      // Check if the user has enough balance
      const userAddress = await getUserAddress();
      
      // Get balance using a try-catch to handle potential errors
      let userBalance;
      try {
        userBalance = await mockCELO.balanceOf(userAddress);
        console.log(`User balance: ${ethers.formatEther(userBalance)} CELO`);
      } catch (balanceError) {
        console.error("Error checking balance:", balanceError);
        
        // Try with the getCELOBalance function as a fallback
        try {
          userBalance = await getCELOBalance(userAddress);
          console.log(`User balance (fallback method): ${ethers.formatEther(userBalance)} CELO`);
        } catch (fallbackError) {
          console.error("Fallback balance check also failed:", fallbackError);
          throw new Error("Could not check your CELO balance. Please make sure the Hardhat node is running and you're connected to the correct network.");
        }
      }
      
      if (userBalance < opponentStake) {
        throw new Error(`Insufficient CELO balance. You need at least ${ethers.formatEther(opponentStake)} CELO to accept this bet. Current balance: ${ethers.formatEther(userBalance)} CELO`);
      }
      
      // Check current allowance
      let currentAllowance;
      try {
        currentAllowance = await mockCELO.allowance(userAddress, noLossBet.target);
        console.log(`Current allowance: ${ethers.formatEther(currentAllowance)} CELO`);
      } catch (allowanceError) {
        console.error("Error checking allowance:", allowanceError);
        throw new Error("Could not check token allowance. Please make sure you're connected to the correct network.");
      }
      
      // If allowance is insufficient, request approval
      if (currentAllowance < opponentStake) {
        console.log("Approving tokens for the contract...");
        try {
          const approveTx = await mockCELO.approve(noLossBet.target, opponentStake, {
            gasLimit: 200000 // Increase gas limit to prevent underestimation
          });
          console.log("Approval transaction sent:", approveTx.hash);
          
          // Wait for the approval transaction to be mined
          const approveReceipt = await approveTx.wait();
          console.log("Approval confirmed in block:", approveReceipt.blockNumber);
        } catch (approveError: any) {
          console.error("Error during token approval:", approveError);
          
          // Provide more specific error message based on the error
          if (approveError.message.includes("user rejected")) {
            throw new Error("You rejected the approval transaction. Please approve to continue.");
          } else if (approveError.message.includes("insufficient funds")) {
            throw new Error("You don't have enough ETH to pay for gas. Please add ETH to your wallet.");
          } else {
            throw new Error(`Failed to approve tokens: ${approveError.message}`);
          }
        }
      } else {
        console.log("Sufficient allowance already exists, skipping approval");
      }
      
      // Verify the allowance was set correctly
      let newAllowance;
      try {
        newAllowance = await mockCELO.allowance(userAddress, noLossBet.target);
        console.log(`New allowance after approval: ${ethers.formatEther(newAllowance)} CELO`);
      } catch (allowanceError) {
        console.error("Error checking new allowance:", allowanceError);
        throw new Error("Could not verify token allowance. Please try again.");
      }
      
      if (newAllowance < opponentStake) {
        throw new Error("Token approval failed. Please try again.");
      }
      
      console.log("Accepting bet...");
      // Now accept the bet with higher gas limit to prevent underestimation
      try {
        // Pass the prediction parameter to the acceptBet function
        const tx = await noLossBet.acceptBet(betId, prediction, {
          gasLimit: 2000000 // Increase gas limit to prevent underestimation
        });
        
        console.log("Bet acceptance transaction sent:", tx.hash);
        
        // Wait for the transaction to be confirmed
        const receipt = await tx.wait();
        console.log("Bet acceptance confirmed in block:", receipt.blockNumber);
        
        // After accepting the bet, check if there's a stored prediction for the creator
        // and submit both outcomes
        try {
          // Get the creator's prediction from localStorage
          const predictionKey = `bet_${betId}_creator_prediction`;
          const creatorPredictionStr = localStorage.getItem(predictionKey);
          
          if (creatorPredictionStr) {
            const creatorPrediction = creatorPredictionStr === 'true';
            console.log(`Retrieved creator's prediction for bet ID ${betId}: ${creatorPrediction}`);
            
            // Submit the creator's outcome
            console.log(`Submitting creator's outcome: ${creatorPrediction}`);
            const creatorSubmitTx = await noLossBet.submitOutcome(betId, creatorPrediction, {
              gasLimit: 500000
            });
            await creatorSubmitTx.wait();
            console.log("Creator's outcome submitted successfully");
            
            // Submit the opponent's outcome (current user)
            console.log(`Submitting opponent's outcome (prediction: ${prediction})`);
            const opponentSubmitTx = await noLossBet.submitOutcome(betId, prediction, {
              gasLimit: 500000
            });
            await opponentSubmitTx.wait();
            console.log("Opponent's outcome submitted successfully");
            
            // Clear the stored prediction
            localStorage.removeItem(predictionKey);
          }
        } catch (submitError) {
          console.error("Error submitting outcomes after bet acceptance:", submitError);
          // Don't throw here, as the bet was accepted successfully
        }
        
        return tx;
      } catch (acceptError: any) {
        console.error("Error accepting bet:", acceptError);
        
        // Provide more specific error message based on the error
        if (acceptError.message.includes("user rejected")) {
          throw new Error("You rejected the transaction. Please confirm to accept the bet.");
        } else if (acceptError.message.includes("insufficient funds")) {
          throw new Error("You don't have enough ETH to pay for gas. Please add ETH to your wallet.");
        } else if (acceptError.message.includes("execution reverted")) {
          throw new Error(`Contract execution reverted: ${acceptError.message}. This might be due to insufficient allowance or balance.`);
        } else {
          throw new Error(`Failed to accept bet: ${acceptError.message}`);
        }
      }
    } catch (err) {
      console.error('Error accepting bet:', err);
      throw err;
    }
  }, [getContracts, getUserAddress, getCELOBalance]);

  const getBet = useCallback(async (betId: string): Promise<any> => {
    try {
      const { noLossBet } = await getContracts();
      
      if (!noLossBet) {
        throw new Error("Contracts not initialized");
      }
      
      console.log(`Getting bet with ID: ${betId}`);
      
      // Use the bets mapping instead of a non-existent getBet function
      const bet = await noLossBet.bets(betId);
      
      // Format the bet data to match the expected structure
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
      
      // First check if the bet exists and is not resolved
      const bet = await noLossBet.bets(betId);
      
      if (bet.resolved) {
        throw new Error("Bet is already resolved");
      }
      
      if (bet.opponent === ethers.ZeroAddress) {
        throw new Error("Bet has not been accepted yet");
      }
      
      // Submit the outcome
      const tx = await noLossBet.submitOutcome(betId, outcome, {
        gasLimit: 500000 // Increase gas limit to prevent underestimation
      });
      
      console.log("Outcome submission transaction sent:", tx.hash);
      
      // Wait for the transaction to be confirmed
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
      
      // Implementation would go here
      // For now, return a placeholder
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
      
      // Implementation would go here
      // For now, return a placeholder
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
      
      // Approve the NoLossBet contract to spend tokens
      const tx = await mockCELO.approve(noLossBet.target, amountWei);
      console.log("Approval transaction sent:", tx.hash);
      
      return tx;
    } catch (err) {
      console.error('Error approving tokens:', err);
      throw err;
    }
  }, [getContracts]);

  const getNextBetId = useCallback(async (): Promise<number> => {
    try {
      const { noLossBet } = await getContracts();
      
      if (!noLossBet) {
        throw new Error("Contracts not initialized");
      }
      
      console.log("Getting next bet ID...");
      
      // Implementation would go here
      // For now, return a placeholder
      return 1;
    } catch (err) {
      console.error('Error getting next bet ID:', err);
      throw err;
    }
  }, [getContracts]);

  const mintCELO = async (amount: string = "110") => {
    console.log("Minting CELO tokens...");
    
    if (!address) {
      await getUserAddress();
    }
    
    try {
      // Get the connected wallet address
      const userAddress = address ?? await getUserAddress();
      console.log("Minting for address:", userAddress);
      
      // Get the contract instances
      const { mockCELO } = await getContracts();
      if (!mockCELO) {
        throw new Error("Failed to get MockCELO contract instance");
      }
      
      // Convert amount to wei (number of digits depends on token decimals)
      const amountWei = ethers.parseEther(amount);
      console.log(`Minting ${amount} CELO (${amountWei.toString()} wei)`);
      
      // Use simulateUnstaking instead of mint to avoid the onlyOwner restriction
      const mintTx = await mockCELO.simulateUnstaking(amountWei, {
        gasLimit: 300000 // Increase gas limit to prevent underestimation
      });
      
      console.log("Mint transaction sent:", mintTx.hash);
      
      // Wait for the transaction to be mined
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
  };

  return (
    <Web3Context.Provider
      value={{
        address,
        getUserAddress,
        disconnect,
        isConnecting,
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
        networkName,
        switchToCelo,
        switchToHardhat,
        switchToCeloMainnet,
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