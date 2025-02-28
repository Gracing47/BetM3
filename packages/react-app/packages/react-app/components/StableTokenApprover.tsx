import React, { useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ethers } from 'ethers';

const StableTokenApprover: React.FC = () => {
  const { address, approveStableToken, getCUSDTokenAddress, getNoLossBetAddress } = useWeb3();
  const [amount, setAmount] = useState('1000');
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsApproving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await approveStableToken(amount);
      console.log('Approval result:', result);
      setSuccess(`Successfully approved ${amount} stableTokens for the NoLossBet contract`);
    } catch (err: any) {
      console.error('Error approving stableTokens:', err);
      setError(err.message || 'Failed to approve stableTokens');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Approve StableTokens (Owner Only)</h2>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Important:</strong> This function is only for the contract owner. The NoLossBet contract requires stableTokens from the owner when users accept bets.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Contract Address: <code className="bg-gray-100 px-1 py-0.5 rounded">{getNoLossBetAddress()}</code>
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              StableToken Address: <code className="bg-gray-100 px-1 py-0.5 rounded">{getCUSDTokenAddress()}</code>
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
          Amount to Approve
        </label>
        <div className="flex">
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="shadow appearance-none border rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter amount"
          />
          <span className="inline-flex items-center px-3 rounded-r border border-l-0 border-gray-300 bg-gray-50 text-gray-500">
            cUSD
          </span>
        </div>
      </div>

      <button
        onClick={handleApprove}
        disabled={isApproving}
        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
      >
        {isApproving ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            <span>Approving...</span>
          </div>
        ) : (
          'Approve StableTokens'
        )}
      </button>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mt-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mt-4">
          {success}
        </div>
      )}
    </div>
  );
};

export default StableTokenApprover; 