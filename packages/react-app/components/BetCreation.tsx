import { useState } from "react";
import { useWeb3 } from "../contexts/useWeb3";
import Button from "./Button";
import { formatTokenAmount } from "../utils/format";

const SUGGESTED_AMOUNTS = [10, 50, 100, 500];
const SUGGESTED_DURATIONS = [
  { label: '1 Day', value: 1 },
  { label: '3 Days', value: 3 },
  { label: '1 Week', value: 7 },
  { label: '2 Weeks', value: 14 },
];

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
            <p className="font-semibold">{formatTokenAmount(data.stakeAmount)}</p>
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

  const handleSuggestedAmount = (amount: number) => {
    setFormData((prev) => ({
      ...prev,
      stakeAmount: amount.toString(),
    }));
  };

  const handleSuggestedDuration = (days: number) => {
    setFormData((prev) => ({
      ...prev,
      duration: days.toString(),
    }));
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
      
      // First approve token spending
      try {
        const approveTx = await approveToken(formData.stakeAmount);
        await approveTx.wait();
      } catch (err) {
        console.error("Error approving tokens:", err);
        setError("Failed to approve tokens. Please try again.");
        setLoading(false);
        return;
      }

      // Then create bet
      const durationInSeconds = parseInt(formData.duration) * 24 * 60 * 60; // Convert days to seconds
      const tx = await createBet(formData.stakeAmount, durationInSeconds, formData.condition);
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
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Bet</h2>
      
      <form className="space-y-6">
        <div>
          <label htmlFor="stakeAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Stake Amount (cUSD)
          </label>
          <input
            type="number"
            id="stakeAmount"
            name="stakeAmount"
            value={formData.stakeAmount}
            onChange={handleInputChange}
            placeholder="Enter stake amount"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            min="0"
            step="0.01"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleSuggestedAmount(amount)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  formData.stakeAmount === amount.toString()
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-300 hover:border-primary'
                }`}
              >
                {amount} cUSD
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duration
          </label>
          <input
            type="number"
            id="duration"
            name="duration"
            value={formData.duration}
            onChange={handleInputChange}
            placeholder="Enter duration in days"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            min="1"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED_DURATIONS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleSuggestedDuration(value)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  formData.duration === value.toString()
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-300 hover:border-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
            Bet Condition
          </label>
          <textarea
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleInputChange}
            placeholder="Describe what this bet is about..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            rows={3}
          />
          <p className="mt-1 text-sm text-gray-500">
            Be specific about the condition and how the winner will be determined.
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <Button
          title="Create Bet"
          onClick={handleCreateBet}
          disabled={loading}
          loading={loading}
          widthFull
        />
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-2">How it works:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Create a bet by setting an amount and duration</li>
          <li>Share with friends to join</li>
          <li>Winner takes all stakes as reward</li>
          <li>Your stake is safe until the bet ends</li>
        </ul>
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
