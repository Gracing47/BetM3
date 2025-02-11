import { useState } from "react";
import { useWeb3 } from "../contexts/useWeb3";
import PrimaryButton from "./Button";

export const BetCreation = () => {
  const { createBet, address, getUserAddress, approveToken } = useWeb3();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
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

    try {
      setLoading(true);
      
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
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
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
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duration (Days)
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
            placeholder="Enter the bet condition"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            rows={3}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <PrimaryButton
          title="Create Bet"
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
          widthFull
        />
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p>Note: Winner takes all stakes as reward. Create or join a bet to get started!</p>
      </div>
    </div>
  );
};

export default BetCreation;
