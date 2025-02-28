import React, { useState } from 'react';
import { formatTokenAmount, formatAddress } from '../utils/format';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/useWeb3';

interface JoinBetModalProps {
  bet: {
    id: string;
    creator: string;
    opponent: string;
    amount: string;
    opponentStake: string;
    condition: string;
    creatorOutcome: boolean | null;
    opponentOutcome: boolean | null;
    resolved: boolean;
    expirationTime: number;
    status: 'Created' | 'Active' | 'Completed' | 'Cancelled';
  };
  onClose: () => void;
  onJoin: (prediction: boolean, stake?: string) => Promise<void>;
  isLoading: boolean;
}

const JoinBetModal: React.FC<JoinBetModalProps> = ({ bet, onClose, onJoin, isLoading }) => {
  const { mintCELO } = useWeb3();
  const [selectedPrediction, setSelectedPrediction] = useState<boolean | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [customStake, setCustomStake] = useState<string>("");
  const [stakeOption, setStakeOption] = useState<'default' | '10' | '100' | 'custom'>('default');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Berechne den tatsächlichen Einsatz basierend auf der ausgewählten Option
  const getStakeAmount = () => {
    switch (stakeOption) {
      case '10':
        return ethers.parseEther('10').toString();
      case '100':
        return ethers.parseEther('100').toString();
      case 'custom':
        return customStake ? ethers.parseEther(customStake).toString() : bet.opponentStake;
      default:
        return bet.opponentStake;
    }
  };

  const handleJoinBet = async () => {
    if (selectedPrediction === null) {
      setError("Please select a prediction (Yes or No)");
      return;
    }
    
    setError(null);
    setIsJoining(true);
    
    try {
      // Get stake amount based on selection
      let finalStake;
      if (stakeOption === 'custom' && customStake) {
        finalStake = customStake;
      } else if (stakeOption === '10') {
        finalStake = '10';
      } else if (stakeOption === '100') {
        finalStake = '100';
      }
      
      console.log("Joining bet with:", {
        prediction: selectedPrediction,
        stake: finalStake || "default"
      });
      
      // Call onJoin with only prediction and stake
      await onJoin(selectedPrediction, finalStake);
    } catch (err: any) {
      console.error("Error joining bet:", err);
      
      // Format error message for display
      let errorMessage = err.message || "Failed to join bet. Please try again.";
      
      // Check for specific error conditions
      if (errorMessage.includes("Insufficient CELO")) {
        errorMessage = "You don't have enough CELO tokens to join this bet. Would you like to mint some?";
      } else if (errorMessage.includes("User rejected")) {
        errorMessage = "Transaction was cancelled.";
      } else if (errorMessage.includes("Internal JSON-RPC error") || errorMessage.includes("ambiguous function description")) {
        // Show more helpful message for contract errors
        errorMessage = "There was an issue with your bet transaction. This might be due to:";
        errorMessage += "\n- Insufficient token approval";
        errorMessage += "\n- The bet may already be accepted";
        errorMessage += "\n- The bet may have expired";
        errorMessage += "\n- You might be the creator of this bet";
        errorMessage += "\n\nPlease check your token balance and try again.";
      } else if (errorMessage.includes("Bet already accepted")) {
        errorMessage = "This bet has already been accepted by another user.";
      } else if (errorMessage.includes("Creator cannot accept own bet")) {
        errorMessage = "You cannot accept your own bet.";
      } else if (errorMessage.includes("Bet has expired")) {
        errorMessage = "This bet has expired and can no longer be accepted.";
      } else if (errorMessage.includes("Stake transfer failed")) {
        errorMessage = "Failed to transfer CELO tokens. Please ensure you have approved enough tokens.";
      }
      
      setError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleMintCELO = async () => {
    setIsMinting(true);
    setError(null);
    setMintSuccess(false);
    
    try {
      // Mint enough CELO tokens to join the bet (add a little extra for gas)
      const stakeAmount = stakeOption === 'default' 
        ? parseFloat(ethers.formatEther(bet.opponentStake)) 
        : stakeOption === 'custom' 
          ? parseFloat(customStake || "0") 
          : parseInt(stakeOption);
          
      const amountToMint = (stakeAmount + 10).toString();
      await mintCELO(amountToMint);
      setMintSuccess(true);
      
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

  // Formatieren des ursprünglichen Einsatzes
  const defaultStakeAmount = ethers.formatEther(bet.opponentStake || '0');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Join Bet</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <h3 className="font-medium text-lg">{bet.condition}</h3>
          <p className="text-sm text-gray-500">Created by {formatAddress(bet.creator)}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-500">Creator Stake</p>
            <p className="font-medium">{formatTokenAmount(bet.amount, 'CELO')}</p>
          </div>
          <div>
            <p className="text-gray-500">Expires In</p>
            <p className="font-medium">
              {Math.max(0, bet.expirationTime - Math.floor(Date.now() / 1000)) > 0 
                ? `${Math.floor((bet.expirationTime - Math.floor(Date.now() / 1000)) / (24 * 60 * 60))}d ${Math.floor(((bet.expirationTime - Math.floor(Date.now() / 1000)) % (24 * 60 * 60)) / (60 * 60))}h` 
                : 'Expired'}
            </p>
          </div>
        </div>
        
        {/* Updated message about the bet flow */}
        <div className="bg-blue-50 text-blue-700 p-3 rounded-md mb-4 text-sm">
          <strong>Vereinfachte Wettannahme:</strong> Wähle deine Vorhersage und setze deinen Einsatz.
          Der Mindesteinsatz beträgt 10 CELO.
        </div>
        
        {/* Stake Selection */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Your Stake:</p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setStakeOption('default')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                stakeOption === 'default' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              Default ({defaultStakeAmount} CELO)
            </button>
            <button
              onClick={() => setStakeOption('10')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                stakeOption === '10' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              10 CELO
            </button>
            <button
              onClick={() => setStakeOption('100')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                stakeOption === '100' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              100 CELO
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setStakeOption('custom')}
              className={`flex-none py-2 px-3 rounded-md text-sm font-medium ${
                stakeOption === 'custom' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              Custom
            </button>
            <input
              type="number"
              placeholder="Enter CELO amount"
              value={customStake}
              onChange={(e) => {
                setCustomStake(e.target.value);
                if (e.target.value) setStakeOption('custom');
              }}
              className="flex-1 border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Your prediction:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPrediction(true)}
              className={`flex-1 py-3 px-4 rounded-md font-medium ${
                selectedPrediction === true 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setSelectedPrediction(false)}
              className={`flex-1 py-3 px-4 rounded-md font-medium ${
                selectedPrediction === false 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              No
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
            {error}
            {error.includes('Insufficient CELO balance') && (
              <div className="mt-2">
                <button
                  onClick={handleMintCELO}
                  disabled={isMinting}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400"
                >
                  {isMinting ? 'Minting...' : `Mint CELO Tokens to Join`}
                </button>
              </div>
            )}
          </div>
        )}
        
        {mintSuccess && (
          <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
            CELO tokens minted successfully! You can now join the bet.
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleJoinBet}
            disabled={selectedPrediction === null || isJoining}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-300"
          >
            {isJoining ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span>Joining...</span>
              </div>
            ) : (
              'Confirm & Join'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinBetModal; 