import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { NoLossBetABI, MockCELOABI, UniswapPoolMockABI, BetM3TokenABI } from '../abis/generated';

// Definiere die globale Window-Schnittstelle mit ethereum
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      isMetaMask?: boolean;
      selectedAddress?: string;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      request: (args: any) => Promise<any>;
    };
  }
}

interface Web3ContextType {
  address: string | null;
  getUserAddress: () => Promise<string>;
  disconnect: () => void;
  isConnecting: boolean;
  createBet: (amount: string, condition: string, durationDays: string) => Promise<any>;
  acceptBet: (betId: string) => Promise<any>;
  getBet: (betId: string) => Promise<any>;
  submitOutcome: (betId: string, outcome: boolean) => Promise<any>;
  resolveBet: (betId: string) => Promise<any>;
  resolveDispute: (betId: string, winner: string) => Promise<any>;
  approveToken: (amount: string) => Promise<any>;
  getCELOBalance: (address: string) => Promise<bigint>;
  getNextBetId: () => Promise<number>;
  networkName: string;
  switchToCelo: () => Promise<void>;
}

// Lokale Hardhat-Adressen (müssen für Testnet oder Mainnet aktualisiert werden)
const NO_LOSS_BET_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
const MOCK_CELO_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const CUSD_TOKEN_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const BET_M3_TOKEN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const UNISWAP_POOL_MOCK_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const LP_TOKEN_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

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
            
            // Überprüfe das aktuelle Netzwerk
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            updateNetworkName(chainId);
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

      // Überprüfe, ob der NoLossBet-Vertrag an der angegebenen Adresse existiert
      try {
        await noLossBet.getFunction('getBet').staticCall(0);
      } catch (err) {
        console.warn('NoLossBet contract may not be deployed at the specified address:', err);
      }

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

  const createBet = useCallback(async (amount: string, condition: string, durationDays: string = "14") => {
    try {
      const { noLossBet, mockCELO } = await getContracts();
      
      // Convert amount to wei
      const amountBN = ethers.parseEther(amount);
      
      // Generate a simple tokenURI for the NFT
      const tokenURI = `ipfs://placeholder/${Date.now()}`;
      
      // First approve the contract to spend tokens
      const approveTx = await mockCELO.approve(NO_LOSS_BET_ADDRESS, ethers.parseEther("100"));
      await approveTx.wait();
      
      console.log("Creating bet with parameters:", {
        opponentStake: amountBN.toString(),
        condition,
        tokenURI
      });
      
      // Call the createBet function with the correct parameters
      // The contract expects: _opponentStake, _condition, _tokenURI
      return await noLossBet.createBet(amountBN, condition, tokenURI);
    } catch (err) {
      console.error("Error creating bet:", err);
      throw err;
    }
  }, [getContracts]);

  const acceptBet = useCallback(async (betId: string) => {
    try {
      const { noLossBet } = await getContracts();
      const bet = await noLossBet.getBet(betId);
      return await noLossBet.acceptBet(betId, { value: bet.amount });
    } catch (err) {
      console.error("Error accepting bet:", err);
      throw err;
    }
  }, [getContracts]);

  const getBet = useCallback(async (betId: string) => {
    try {
      const { noLossBet } = await getContracts();
      return await noLossBet.getBet(betId);
    } catch (err) {
      console.error("Error getting bet:", err);
      throw err;
    }
  }, [getContracts]);

  const submitOutcome = useCallback(async (betId: string, outcome: boolean) => {
    try {
      const { noLossBet } = await getContracts();
      return await noLossBet.submitOutcome(betId, outcome);
    } catch (err) {
      console.error("Error submitting outcome:", err);
      throw err;
    }
  }, [getContracts]);

  const resolveBet = useCallback(async (betId: string) => {
    try {
      const { noLossBet } = await getContracts();
      return await noLossBet.resolveBet(betId);
    } catch (err) {
      console.error("Error resolving bet:", err);
      throw err;
    }
  }, [getContracts]);

  const resolveDispute = useCallback(async (betId: string, winner: string) => {
    try {
      const { noLossBet } = await getContracts();
      return await noLossBet.resolveDispute(betId, winner);
    } catch (err) {
      console.error("Error resolving dispute:", err);
      throw err;
    }
  }, [getContracts]);

  const approveToken = useCallback(async (amount: string) => {
    try {
      const { signer } = await getContracts();
      const token = new ethers.Contract(
        CUSD_TOKEN_ADDRESS,
        [
          "function approve(address spender, uint256 amount) returns (bool)"
        ],
        signer
      );
      const amountBN = ethers.parseEther(amount);
      return await token.approve(LP_TOKEN_ADDRESS, amountBN);
    } catch (err) {
      console.error("Error approving tokens:", err);
      throw err;
    }
  }, [getContracts]);

  const getCELOBalance = useCallback(async (address: string): Promise<bigint> => {
    try {
      const { mockCELO } = await getContracts();
      return await mockCELO.balanceOf(address);
    } catch (err) {
      console.error("Error getting CELO balance:", err);
      throw err;
    }
  }, [getContracts]);

  const getNextBetId = useCallback(async (): Promise<number> => {
    try {
      const { noLossBet } = await getContracts();
      const nextBetId = await noLossBet.nextBetId();
      return Number(nextBetId);
    } catch (err) {
      console.error("Error getting next bet ID:", err);
      throw err;
    }
  }, [getContracts]);

  // Event-Listener für Wallet-Verbindungsänderungen
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // Benutzer hat sich abgemeldet oder alle Konten getrennt
          setAddress(null);
          localStorage.removeItem(WALLET_KEY);
        } else if (accounts[0] !== address) {
          // Benutzer hat das Konto gewechselt
          setAddress(accounts[0]);
        }
      };

      const handleChainChanged = () => {
        // Wenn sich die Chain ändert, aktualisiere den Netzwerknamen
        if (window.ethereum) {
          window.ethereum.request({ method: 'eth_chainId' }).then((chainId: string) => {
            updateNetworkName(chainId);
          });
        }
        
        // Seite neu laden, wenn sich die Chain ändert
        window.location.reload();
      };

      const ethereum = window.ethereum;
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [address]);

  const contextValue: Web3ContextType = {
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
    networkName,
    switchToCelo
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
