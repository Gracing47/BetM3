import React, { useState, useEffect } from 'react';
import { formatTokenAmount, formatAddress } from '../utils/format';
import { BigNumberish, ethers } from 'ethers';
import { useWeb3 } from '../contexts/web3Context';

interface BetDisplayProps {
  bet: {
    [x: string]: BigNumberish;
    id: string;
    creator: string;
    condition: string;
    expirationTime: BigNumberish;
    resolved: BigNumberish;
    totalStakeTrue: string;
    totalStakeFalse: string;
    resolutionFinalized: BigNumberish;
    winningOutcome: BigNumberish;
    status: 'Created' | 'Active' | 'Expired' | 'Completed';
  };
  onJoin: () => void;
  onBetUpdated?: () => void;
  isLoading?: boolean;
}

const BetDisplay: React.FC<BetDisplayProps> = ({ bet, onJoin, onBetUpdated, isLoading = false }) => {
  const { address, submitOutcome, resolveBet, mintCELO, getCELOBalance, getParticipantStake } = useWeb3();
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [originalDuration, setOriginalDuration] = useState<string>('');
  const [userStake, setUserStake] = useState<string>('0');
  
  const isActive = bet.status === 'Active';
  const canJoin = bet.status === 'Created';
  const timeLeft = Math.max(0, Number(bet.expirationTime) - Math.floor(Date.now() / 1000));
  
  const isCreator = address?.toLowerCase() === bet.creator.toLowerCase();
  
  // Check if user has stake in this bet
  useEffect(() => {
    const checkUserStake = async () => {
      if (address && bet.id) {
        const stake = await getParticipantStake(bet.id, address);
        setUserStake(stake);
      }
    };
    
    checkUserStake();
  }, [address, bet.id, getParticipantStake]);
  
  const isParticipant = isCreator || (userStake !== '0');
  
  const canSubmitOutcome = isParticipant && isActive && !bet.resolved;
  const hasSubmittedOutcome = false; // This needs to be checked differently with NoLossBetMulti
  
  const canResolve = isParticipant && bet.status === 'Expired' && !bet.resolved;
  
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
        const elapsedTime = Date.now()/1000 - Math.floor(Date.now()/1000 - timeLeft);
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
    <div className={`bg-white shadow rounded-lg overflow-hidden ${isLoading ? 'opacity-50' : ''}`}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">{bet.condition}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">Created by {formatAddress(bet.creator)}</p>
              {isCreator && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">You</span>}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xs rounded-full px-2 py-0.5 ${
              bet.status === 'Active' ? 'bg-green-100 text-green-800' : 
              bet.status === 'Completed' ? 'bg-purple-100 text-purple-800' : 
              bet.status === 'Expired' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {bet.status}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {timeLeft > 0 
                ? `Expires in ${formatTimeLeft()}`
                : 'Expired'}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-gray-500">True Side Stake</p>
            <p className="font-medium">{formatTokenAmount(bet.totalStakeTrue, 'CELO')}</p>
          </div>
          <div>
            <p className="text-gray-500">False Side Stake</p>
            <p className="font-medium">{formatTokenAmount(bet.totalStakeFalse, 'CELO')}</p>
          </div>
          {userStake !== '0' && (
            <div className="col-span-2">
              <p className="text-gray-500">Your Stake</p>
              <p className="font-medium">{formatTokenAmount(userStake, 'CELO')}</p>
            </div>
          )}
        </div>
        
        {bet.resolved && (
          <div className="bg-blue-50 p-3 rounded mb-4">
            <h4 className="font-medium mb-1">Result</h4>
            <p>Winning outcome: <strong>{bet.winningOutcome ? "TRUE" : "FALSE"}</strong></p>
          </div>
        )}
        
        {canSubmitOutcome && !hasSubmittedOutcome && (
          <div className="border border-gray-200 rounded p-3 mb-4">
            <h4 className="text-sm font-medium mb-2">Cast Your Resolution Vote</h4>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSelectedOutcome(true)}
                className={`flex-1 py-1 px-3 text-sm rounded border ${
                  selectedOutcome === true 
                    ? 'bg-green-100 border-green-500 text-green-700' 
                    : 'border-gray-300'
                }`}
              >
                TRUE
              </button>
              <button
                onClick={() => setSelectedOutcome(false)}
                className={`flex-1 py-1 px-3 text-sm rounded border ${
                  selectedOutcome === false 
                    ? 'bg-red-100 border-red-500 text-red-700' 
                    : 'border-gray-300'
                }`}
              >
                FALSE
              </button>
            </div>
            <button
              onClick={handleSubmitOutcome}
              disabled={selectedOutcome === null || isSubmitting}
              className="w-full bg-blue-600 text-white py-1 text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Vote'}
            </button>
          </div>
        )}
        
        {canResolve && (
          <div className="border border-gray-200 rounded p-3 mb-4">
            <h4 className="text-sm font-medium mb-2">Finalize Resolution</h4>
            <p className="text-sm text-gray-600 mb-2">The bet has expired and can now be resolved.</p>
            <button
              onClick={handleResolveBet}
              disabled={isResolving}
              className="w-full bg-purple-600 text-white py-1 text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResolving ? 'Resolving...' : 'Finalize Resolution'}
            </button>
          </div>
        )}
        
        {!isParticipant && !bet.resolved && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={onJoin}
              disabled={isLoading || bet.status !== 'Active'}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Bet
            </button>
            
            <button 
              onClick={handleMintCELO}
              disabled={isMinting}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-3 rounded font-medium flex items-center justify-center"
            >
              {isMinting ? 'Minting...' : 'Mint CELO'}
            </button>
          </div>
        )}
        
        {/* Success/Error messages */}
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {mintSuccess && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            Successfully minted 50 CELO tokens!
          </div>
        )}
      </div>
    </div>
  );
};

export default BetDisplay;
