import React, { useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';

interface FormData {
  stakeAmount: string;
  condition: string;
  duration: string;
}

interface BetCreationProps {
  onBetCreated?: () => void;
}

export const BetCreation: React.FC<BetCreationProps> = ({ onBetCreated }) => {
  const { createBet } = useWeb3();
  const [formData, setFormData] = useState<FormData>({
    stakeAmount: '',
    condition: '',
    duration: '14'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.stakeAmount || !formData.condition || !formData.duration) {
      setError('Please fill in all fields');
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
  };

  const handleCreateBet = async () => {
    setIsLoading(true);
    setError(null);
    setShowConfirmation(false);

    try {
      const tx = await createBet(formData.stakeAmount, formData.condition, formData.duration);
      await tx.wait();
      
      // Reset form and show success message
      setFormData({
        stakeAmount: '',
        condition: '',
        duration: '14'
      });
      setSuccess(true);
      
      // Notify parent component to refresh bets list
      if (onBetCreated) {
        onBetCreated();
      }
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error creating bet:', err);
      setError(err.message || 'Failed to create bet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create a New Bet</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          Bet created successfully! Your stake has been deposited.
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="stakeAmount" className="block text-gray-700 font-medium mb-2">
            Stake Amount (CELO)
          </label>
          <input
            type="number"
            id="stakeAmount"
            name="stakeAmount"
            value={formData.stakeAmount}
            onChange={handleChange}
            placeholder="0.1"
            min="0.01"
            step="0.01"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">
            This amount will be deposited into a Uniswap liquidity pool to generate yield.
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="duration" className="block text-gray-700 font-medium mb-2">
            Bet Duration
          </label>
          <select
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          >
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7">1 week</option>
            <option value="14">2 weeks</option>
            <option value="30">1 month</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            The bet will expire after this period if not resolved.
          </p>
        </div>
        
        <div className="mb-6">
          <label htmlFor="condition" className="block text-gray-700 font-medium mb-2">
            Bet Condition
          </label>
          <textarea
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            placeholder="e.g., 'It will rain tomorrow in New York'"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-24"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Clearly state the condition that will determine the outcome of the bet.
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
            <h3 className="text-xl font-bold mb-4">Confirm Bet Creation</h3>
            <p className="mb-4">
              You are about to create a bet with the following details:
            </p>
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <div className="mb-2">
                <span className="font-medium">Stake Amount:</span> {formData.stakeAmount} CELO
              </div>
              <div className="mb-2">
                <span className="font-medium">Duration:</span> {formData.duration} days
              </div>
              <div>
                <span className="font-medium">Condition:</span> {formData.condition}
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Your stake will be deposited into a Uniswap liquidity pool to generate yield. Both you and your opponent will receive your original stake back, regardless of the outcome.
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
