import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ethers } from 'ethers';

export const CELOMinter: React.FC = () => {
  const { mintCELO, getCELOBalance, address } = useWeb3();
  const [amount, setAmount] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load balance on component mount and when address changes
  useEffect(() => {
    if (address) {
      checkBalance();
    }
  }, [address]);

  const handleMint = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log(`Attempting to mint ${amount} CELO tokens to ${address}`);
      await mintCELO(amount);
      setSuccess(`Successfully minted ${amount} CELO tokens!`);
      
      // Update balance after minting
      if (address) {
        setTimeout(async () => {
          await checkBalance();
        }, 1000); // Small delay to ensure transaction is processed
      }
    } catch (err: any) {
      console.error("Mint error:", err);
      setError(err.message || 'Failed to mint CELO tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBalance = async () => {
    if (!address) return;
    
    try {
      console.log(`Checking CELO balance for ${address}`);
      const balanceWei = await getCELOBalance(address);
      console.log(`Raw balance: ${balanceWei.toString()}`);
      setBalance(ethers.formatEther(balanceWei));
    } catch (err: any) {
      console.error("Balance check error:", err);
      setError(err.message || 'Failed to get CELO balance');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">CELO Token Minter (Testing Only)</h2>
      
      <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
        <div className="flex-1">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount to Mint
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            min="1"
          />
        </div>
        
        <button
          onClick={handleMint}
          disabled={isLoading || !amount}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400"
        >
          {isLoading ? 'Minting...' : 'Mint CELO Tokens'}
        </button>
        
        <button
          onClick={checkBalance}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Check Balance
        </button>
      </div>
      
      {balance !== null && (
        <div className="bg-blue-50 p-3 rounded-md mb-4">
          <p className="text-blue-800">
            Current CELO Balance: <span className="font-bold">{balance} CELO</span>
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-3 rounded-md mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 p-3 rounded-md mb-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Note: This is for testing purposes only and will only work on local development networks.</p>
      </div>
    </div>
  );
};

export default CELOMinter; 