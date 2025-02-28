import React, { useState, useEffect } from 'react';
import { formatTokenAmount, formatAddress } from '../utils/format';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/web3Context';

interface BetDisplayProps {
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
  onJoin: () => void;
  onBetUpdated?: () => void;
  isLoading?: boolean;
}

const BetDisplay: React.FC<BetDisplayProps> = ({ bet, onJoin, onBetUpdated, isLoading = false }) => {
  const { address, submitOutcome, resolveBet, mintCELO, getCELOBalance } = useWeb3();
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [originalDuration, setOriginalDuration] = useState<string>('');
  
  const isActive = bet.status === 'Active';
  const canJoin = bet.status === 'Created' && bet.opponent === ethers.ZeroAddress;
  const timeLeft = Math.max(0, bet.expirationTime - Math.floor(Date.now() / 1000));
  
  const isCreator = address?.toLowerCase() === bet.creator.toLowerCase();
  const isOpponent = address?.toLowerCase() === bet.opponent.toLowerCase();
  const isParticipant = isCreator || isOpponent;
  
  const canSubmitOutcome = isParticipant && isActive && !bet.resolved;
  const hasSubmittedOutcome = isCreator 
    ? bet.creatorOutcome !== null 
    : isOpponent 
      ? bet.opponentOutcome !== null 
      : false;
  
  const canResolve = isParticipant && isActive && !bet.resolved && 
                    bet.creatorOutcome !== null && bet.opponentOutcome !== null && 
                    bet.creatorOutcome === bet.opponentOutcome;
  
  // Calculate original duration when component mounts or bet changes
  useEffect(() => {
    // Default duration from contract is 7 days if not specified
    const DEFAULT_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
    
    // Calculate approximate creation time by subtracting expiration time from default or custom duration
    // This is an approximation since we don't store the exact creation time
    let durationInSeconds;
    
    if (bet.status === 'Created') {
      // For newly created bets, we can use the default or calculate from expiration
      durationInSeconds = DEFAULT_DURATION;
    } else {
      // For active or completed bets, calculate based on expiration
      // We're making an educated guess about the original duration
      // Common durations: 1 day, 3 days, 7 days, 14 days, 30 days
      const possibleDurations = [
        1 * 24 * 60 * 60,  // 1 day
        3 * 24 * 60 * 60,  // 3 days
        7 * 24 * 60 * 60,  // 7 days (default)
        14 * 24 * 60 * 60, // 14 days
        30 * 24 * 60 * 60  // 30 days
      ];
      
      // Find the closest standard duration
      durationInSeconds = DEFAULT_DURATION; // Default fallback
      
      // If the bet is still active, we can estimate from remaining time
      if (timeLeft > 0 && bet.status !== 'Completed') {
        const elapsedTime = Date.now()/1000 - (bet.expirationTime - timeLeft);
        const totalTime = timeLeft + elapsedTime;
        
        // Find the closest standard duration
        let closestDiff = Number.MAX_VALUE;
        for (const duration of possibleDurations) {
          const diff = Math.abs(duration - totalTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            durationInSeconds = duration;
          }
        }
      }
    }
    
    setOriginalDuration(formatDuration(durationInSeconds));
  }, [bet]);
  
  const formatDuration = (durationSeconds: number) => {
    const days = Math.floor(durationSeconds / (24 * 60 * 60));
    const hours = Math.floor((durationSeconds % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) {
      return days === 1 ? '1 day' : `${days} days`;
    }
    
    if (hours > 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    
    const minutes = Math.floor((durationSeconds % (60 * 60)) / 60);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  };
  
  const formatTimeLeft = () => {
    const days = Math.floor(timeLeft / (24 * 60 * 60));
    const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleSubmitOutcome = async () => {
    if (selectedOutcome === null) {
      setError("Please select an outcome");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const tx = await submitOutcome(bet.id, selectedOutcome);
      await tx.wait();
      // Notify parent component to refresh data
      if (onBetUpdated) {
        onBetUpdated();
      }
    } catch (err: any) {
      console.error("Error submitting outcome:", err);
      
      // Handle specific error messages
      if (err.message.includes('user rejected')) {
        setError('You rejected the transaction. Please confirm the transaction in your wallet to submit the outcome.');
      } else if (err.message.includes('Could not connect to local Hardhat node')) {
        setError('Could not connect to local Hardhat node. Please make sure it is running with "npx hardhat node".');
      } else {
        setError(err.message || "Failed to submit outcome");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResolveBet = async () => {
    setIsResolving(true);
    setError(null);
    
    try {
      const tx = await resolveBet(bet.id);
      await tx.wait();
      // Notify parent component to refresh data
      if (onBetUpdated) {
        onBetUpdated();
      }
    } catch (err: any) {
      console.error("Error resolving bet:", err);
      
      // Handle specific error messages
      if (err.message.includes('user rejected')) {
        setError('You rejected the transaction. Please confirm the transaction in your wallet to resolve the bet.');
      } else if (err.message.includes('Could not connect to local Hardhat node')) {
        setError('Could not connect to local Hardhat node. Please make sure it is running with "npx hardhat node".');
      } else {
        setError(err.message || "Failed to resolve bet");
      }
    } finally {
      setIsResolving(false);
    }
  };

  const handleMintCELO = async () => {
    if (!address) return;
    
    setIsMinting(true);
    setError(null);
    setMintSuccess(false);
    
    try {
      // Mint enough CELO tokens to join the bet (add a little extra for gas)
      const amountToMint = (parseFloat(ethers.formatEther(bet.opponentStake)) + 10).toString();
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

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full text-gray-600">#{bet.id}</span>
            <h3 className="font-medium text-lg">{bet.condition}</h3>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">Created by {formatAddress(bet.creator)}</p>
            {isCreator && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">You</span>}
            {isOpponent && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Your Bet</span>}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          bet.status === 'Created' ? 'bg-blue-100 text-blue-800' :
          bet.status === 'Active' ? 'bg-green-100 text-green-800' :
          bet.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {bet.status}
        </span>
      </div>

      <div className="border-t border-b border-gray-100 py-3 my-2">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">Creator Stake</p>
            <p className="font-medium text-primary">{formatTokenAmount(bet.amount, 'CELO')} <span className="text-xs text-gray-500">(Fixed for MVP)</span></p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Opponent Stake</p>
            <p className="font-medium text-primary">
              {bet.opponent && bet.opponent !== ethers.ZeroAddress 
                ? formatTokenAmount(bet.opponentStake, 'CELO')
                : '0.00 CELO'}
              {parseFloat(bet.opponentStake) < 100 && bet.opponent !== ethers.ZeroAddress && 
                <span className="text-xs text-amber-500 ml-1">(Min: 100 CELO)</span>}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Status</p>
            <p className="font-medium">
              {bet.resolved 
                ? 'Resolved' 
                : bet.opponent !== ethers.ZeroAddress 
                  ? 'Active' 
                  : 'Waiting for opponent'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Creator</p>
            <p className="font-medium">{formatAddress(bet.creator)}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Opponent</p>
            <p className="font-medium">
              {bet.opponent && bet.opponent !== ethers.ZeroAddress 
                ? formatAddress(bet.opponent) 
                : 'None yet'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Duration</p>
            <p className="font-medium">{originalDuration}</p>
          </div>
          <div className="col-span-3 mt-2">
            <p className="text-gray-500 font-medium mb-1">Time Remaining</p>
            <div className="flex items-center">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${timeLeft > 0 ? 'bg-blue-600' : 'bg-red-500'}`} 
                     style={{ width: `${Math.min(100, (timeLeft / (7 * 24 * 60 * 60)) * 100)}%` }}></div>
              </div>
              <span className="ml-2 font-medium min-w-[60px] text-right">{timeLeft > 0 ? formatTimeLeft() : 'Expired'}</span>
            </div>
          </div>
        </div>
      </div>

      {canJoin && (
        <button
          onClick={onJoin}
          disabled={isLoading}
          className="w-full mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-300 font-medium"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              <span>Joining...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Join Bet
            </div>
          )}
        </button>
      )}

      {/* Outcome submission section */}
      {canSubmitOutcome && !hasSubmittedOutcome && (
        <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
          <p className="text-sm font-medium mb-3">Submit your prediction:</p>
          
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedOutcome(true)}
              className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors ${
                selectedOutcome === true 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setSelectedOutcome(false)}
              className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors ${
                selectedOutcome === false 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              No
            </button>
          </div>
          
          <button
            onClick={handleSubmitOutcome}
            disabled={selectedOutcome === null || isSubmitting}
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-300 font-medium transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Prediction'
            )}
          </button>
        </div>
      )}
      
      {/* Resolve bet section */}
      {canResolve && (
        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-100">
          <p className="text-sm font-medium mb-3">Both parties agree on the outcome!</p>
          
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <button
            onClick={handleResolveBet}
            disabled={isResolving}
            className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 font-medium transition-colors"
          >
            {isResolving ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span>Resolving...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Resolve Bet & Claim Rewards
              </div>
            )}
          </button>
        </div>
      )}

      {/* Outcome display section */}
      {(bet.status === 'Active' || bet.status === 'Completed') && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium mb-2">Outcome Predictions:</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">Creator's Prediction</span>
              <span className={`text-sm font-medium px-3 py-1 rounded-full text-center ${
                bet.creatorOutcome === null 
                  ? 'bg-gray-100 text-gray-600' 
                  : bet.creatorOutcome 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
              }`}>
                {bet.opponent === ethers.ZeroAddress && bet.creatorOutcome === false 
                  ? 'Not submitted' 
                  : bet.creatorOutcome === null 
                    ? 'Not submitted' 
                    : bet.creatorOutcome 
                      ? 'Yes' 
                      : 'No'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 mb-1">Opponent's Prediction</span>
              <span className={`text-sm font-medium px-3 py-1 rounded-full text-center ${
                bet.opponent === ethers.ZeroAddress 
                  ? 'bg-gray-100 text-gray-600' 
                  : bet.opponentOutcome === null 
                    ? 'bg-gray-100 text-gray-600' 
                    : bet.opponentOutcome 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
              }`}>
                {bet.opponent === ethers.ZeroAddress 
                  ? 'None yet' 
                  : bet.opponentOutcome === null 
                    ? 'Not submitted' 
                    : bet.opponentOutcome 
                      ? 'Yes' 
                      : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default BetDisplay;
