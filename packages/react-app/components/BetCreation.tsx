import React, { useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ethers } from 'ethers';
import Button from "./Button";
import { formatTokenAmount, toWei } from "../utils/format";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: {
    stakeAmount: string;
    duration: string;
    condition: string;
  };
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Confirm Bet Creation</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Stake Amount</p>
            <p className="font-semibold">{`${data.stakeAmount} CELO`}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="font-semibold">{data.duration} days</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Condition</p>
            <p className="font-semibold">{data.condition}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export const BetCreation = () => {
  const { createBet, address, getUserAddress, approveToken } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    stakeAmount: "",
    duration: "",
    condition: "",
  });
  const [error, setError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const suggestedAmounts = [0.1, 0.5, 1, 5]; // Smaller amounts for testing
  const suggestedDurations = [
    { days: 1, label: "1 Day" },
    { days: 3, label: "3 Days" },
    { days: 7, label: "1 Week" },
    { days: 14, label: "2 Weeks" }
  ];

  const handleSuggestedAmount = (amount: number) => {
    setFormData((prev) => ({
      ...prev,
      stakeAmount: amount.toString(),
    }));
    setError("");
  };

  const handleSuggestedDuration = (days: number) => {
    setFormData((prev) => ({
      ...prev,
      duration: days.toString(),
    }));
    setError("");
  };

  const handleCreateBet = async () => {
    setError("");

    if (!address) {
      try {
        await getUserAddress();
      } catch (err) {
        setError("Please connect your wallet first");
        return;
      }
    }

    if (!formData.stakeAmount || !formData.duration || !formData.condition) {
      setError("Please fill in all fields");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmedCreate = async () => {
    try {
      setLoading(true);
      setShowConfirmation(false);
      
      // Convert amount to wei before approval
      const amountInWei = toWei(formData.stakeAmount);
      
      // First approve token spending
      try {
        const approveTx = await approveToken(amountInWei);
        await approveTx.wait();
      } catch (err) {
        console.error("Error approving tokens:", err);
        setError("Failed to approve tokens. Please try again.");
        setLoading(false);
        return;
      }

      // Then create bet with same wei amount
      const durationInSeconds = parseInt(formData.duration) * 24 * 60 * 60;
      const tx = await createBet(amountInWei, durationInSeconds, formData.condition);
      await tx.wait();
      
      // Reset form
      setFormData({
        stakeAmount: "",
        duration: "",
        condition: "",
      });
    } catch (err) {
      console.error("Error creating bet:", err);
      setError("Failed to create bet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="bet-creation" className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Create New Bet</h2>
      
      <div className="space-y-6">
        {/* Stake Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stake Amount (CELO)
          </label>
          <input
            type="number"
            name="stakeAmount"
            value={formData.stakeAmount}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md mb-2"
            placeholder="10"
          />
          <div className="flex gap-2 flex-wrap">
            {suggestedAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleSuggestedAmount(amount)}
                className="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200"
              >
                {amount} CELO
              </button>
            ))}
          </div>
        </div>

        {/* Duration Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md mb-2"
            placeholder="Enter duration in days"
          />
          <div className="flex gap-2 flex-wrap">
            {suggestedDurations.map((duration) => (
              <button
                key={duration.days}
                onClick={() => handleSuggestedDuration(duration.days)}
                className="px-3 py-1 text-sm bg-gray-100 rounded-full hover:bg-gray-200"
              >
                {duration.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bet Condition Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bet Condition
          </label>
          <textarea
            name="condition"
            value={formData.condition}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md h-24"
            placeholder="Describe what this bet is about..."
          />
          <p className="text-sm text-gray-500 mt-1">
            Be specific about the condition and how the winner will be determined.
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <button
          onClick={handleCreateBet}
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Bet"}
        </button>

        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">How it works:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Create a bet by setting an amount and duration</li>
            <li>• Share with friends to join</li>
            <li>• Winner takes all yield as reward</li>
            <li>• Your CELO stake is safe until the bet ends</li>
          </ul>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmedCreate}
        data={formData}
      />
    </div>
  );
};
