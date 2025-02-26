import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ethers } from 'ethers';

interface FormData {
  stake: string;
  condition: string;
  duration: number;
  durationUnit: 'hours' | 'days';
  prediction: boolean | null;
}

interface BetCreationProps {
  onBetCreated?: () => void;
}

export const BetCreation: React.FC<BetCreationProps> = ({ onBetCreated }) => {
  const { createBet, address, getCELOBalance, mintCELO } = useWeb3();
  const [formData, setFormData] = useState<FormData>({
    stake: '100',
    condition: '',
    duration: 24,
    durationUnit: 'hours',
    prediction: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Fetch user's CELO balance when component mounts or address changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        try {
          setIsCheckingBalance(true);
          const balanceBigInt = await getCELOBalance(address);
          // Convert from wei to CELO
          const balanceInCELO = parseFloat(balanceBigInt.toString()) / 1e18;
          setBalance(balanceInCELO.toString());
        } catch (error) {
          console.error('Error fetching balance:', error);
        } finally {
          setIsCheckingBalance(false);
        }
      }
    };

    fetchBalance();
  }, [address, getCELOBalance]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle prediction selection
  const handlePredictionChange = (prediction: boolean) => {
    setFormData(prev => ({ ...prev, prediction }));
  };

  const handleDurationChange = (type: 'increment' | 'decrement') => {
    setFormData(prev => {
      let newDuration = prev.duration;
      
      if (type === 'increment') {
        if (prev.durationUnit === 'hours') {
          newDuration += 1;
        } else {
          newDuration += 1;
        }
      } else {
        if (prev.durationUnit === 'hours') {
          newDuration = Math.max(1, newDuration - 1);
        } else {
          newDuration = Math.max(1, newDuration - 1);
        }
      }
      
      return { ...prev, duration: newDuration };
    });
  };

  const handleDurationUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as 'hours' | 'days';
    
    setFormData(prev => {
      // Convert duration when changing units
      let newDuration = prev.duration;
      if (prev.durationUnit === 'days' && newUnit === 'hours') {
        newDuration = prev.duration * 24;
      } else if (prev.durationUnit === 'hours' && newUnit === 'days') {
        newDuration = Math.max(1, Math.floor(prev.duration / 24));
      }
      
      return {
        ...prev,
        duration: newDuration,
        durationUnit: newUnit
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.stake || !formData.condition) {
      setError('Please fill in all fields');
      return;
    }

    // Validate prediction
    if (formData.prediction === null) {
      setError('Please select Yes or No for your prediction');
      return;
    }

    // Validate minimum stake
    if (parseFloat(formData.stake) < 100) {
      setError('Stake must be at least 100 CELO');
      return;
    }

    // Check if user has enough balance
    if (parseFloat(formData.stake) > parseFloat(balance)) {
      setError('Not enough CELO in your wallet. Your current balance: ' + balance + ' CELO');
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  const handleCreateBet = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stakeAmount = formData.stake;
      
      // Check user balance first
      if (address) {
        const userBalance = await getCELOBalance(address);
        const requiredBalance = ethers.parseEther("100"); // 100 CELO for creator stake
        
        if (userBalance < requiredBalance) {
          setError(`Insufficient CELO balance. You need at least 100 CELO to create a bet. Your balance: ${ethers.formatEther(userBalance)} CELO`);
          setIsLoading(false);
          return;
        }
      }
      
      // Calculate duration in seconds
      const durationDays = (formData.durationUnit === 'hours' 
        ? formData.duration / 24 
        : formData.duration).toString();
      
      // Get prediction
      const prediction = formData.prediction === true;
      
      const response = await createBet(
        stakeAmount,
        formData.condition,
        durationDays,
        prediction
      );
      
      console.log("Bet created successfully:", response);
      setShowConfirmation(true);
      
      // Reset form after successful creation
      setFormData({
        stake: '100',
        condition: '',
        duration: 24,
        durationUnit: 'hours',
        prediction: null
      });
      
      if (onBetCreated) {
        onBetCreated();
      }
    } catch (error: any) {
      console.error("Error creating bet:", error);
      setError(error.message || "Failed to create bet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMintCELO = async () => {
    setIsMinting(true);
    setError(null);
    setMintSuccess(false);
    
    try {
      // Mint 200 CELO tokens (enough for creating a bet)
      await mintCELO('200');
      setMintSuccess(true);
      
      // Update balance after minting
      if (address) {
        setTimeout(async () => {
          const balanceBigInt = await getCELOBalance(address);
          const balanceInCELO = parseFloat(balanceBigInt.toString()) / 1e18;
          setBalance(balanceInCELO.toString());
        }, 1000); // Small delay to ensure transaction is processed
      }
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setMintSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error minting CELO:', err);
      setError(err.message || 'Failed to mint CELO tokens. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  // Calculate duration in days for display
  const getDurationDisplay = () => {
    if (formData.durationUnit === 'hours') {
      return `${formData.duration} hours`;
    } else {
      return `${formData.duration} days`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create a New Bet</h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('Insufficient CELO balance') && (
                <button
                  onClick={handleMintCELO}
                  disabled={isMinting}
                  className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {isMinting ? 'Minting...' : 'Mint 110 CELO to Create Bet'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          Bet created successfully! Your stake has been deposited.
        </div>
      )}
      
      {mintSuccess && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          200 CELO tokens minted successfully! You can now create a bet.
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-md mb-6">
        <p className="text-blue-800">
          <strong>Note:</strong> Your stake will be invested in yield farming. Regardless of the bet outcome, you'll receive your original stake back.
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="stake" className="block text-gray-700 font-medium mb-2">
            Your Stake (CELO)
          </label>
          <div className="relative">
            <input
              type="number"
              id="stake"
              name="stake"
              value={formData.stake}
              onChange={handleChange}
              placeholder="100"
              min="100"
              step="1"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <div className="absolute right-3 top-3 text-sm text-gray-500">
              CELO
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-sm text-gray-500">
              Minimum 100 CELO
            </p>
            <p className="text-sm text-gray-500">
              Your balance: {isCheckingBalance ? 'Loading...' : `${parseFloat(balance).toFixed(2)} CELO`}
            </p>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="condition" className="block text-gray-700 font-medium mb-2">
            Bet Condition
          </label>
          <textarea
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            placeholder="e.g., 'It will rain tomorrow in Berlin'"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-24"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Clearly describe the condition that will determine the outcome of the bet.
          </p>
        </div>
        
        {/* Add prediction selection */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            Your Prediction
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handlePredictionChange(true)}
              className={`flex-1 py-3 px-4 rounded-md border ${
                formData.prediction === true
                  ? 'bg-green-100 border-green-500 text-green-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={isLoading}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handlePredictionChange(false)}
              className={`flex-1 py-3 px-4 rounded-md border ${
                formData.prediction === false
                  ? 'bg-red-100 border-red-500 text-red-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={isLoading}
            >
              No
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Select whether you believe the condition will be true (Yes) or false (No).
          </p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Duration
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => handleDurationChange('decrement')}
                className="p-2 border border-gray-300 rounded-l-md hover:bg-gray-100"
                disabled={isLoading || formData.duration <= 1}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                className="w-full p-3 border-y border-gray-300 text-center focus:outline-none focus:ring-0"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => handleDurationChange('increment')}
                className="p-2 border border-gray-300 rounded-r-md hover:bg-gray-100"
                disabled={isLoading}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            <select
              name="durationUnit"
              value={formData.durationUnit}
              onChange={handleDurationUnitChange}
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            The bet will run for {getDurationDisplay()} from the moment it is accepted.
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Bet'}
        </button>
      </form>
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirm Bet</h3>
            <p className="mb-4">
              You are about to create a bet with the following details:
            </p>
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <div className="mb-2">
                <span className="font-medium">Your Stake:</span> {parseFloat(formData.stake).toFixed(2)} CELO
              </div>
              <div className="mb-2">
                <span className="font-medium">Duration:</span> {getDurationDisplay()}
              </div>
              <div className="mb-2">
                <span className="font-medium">Condition:</span> {formData.condition}
              </div>
              <div>
                <span className="font-medium">Your Prediction:</span> {formData.prediction ? 'Yes' : 'No'}
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Your stake will be deposited into a Uniswap liquidity pool to generate yield. Regardless of the bet outcome, you'll receive your original stake back.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBet}
                className="flex-1 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
