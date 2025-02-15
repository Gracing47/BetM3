import React from 'react';
import { formatTokenAmount } from '../utils/format';
import { formatAddress } from '../utils/format';

interface BetDisplayProps {
  bet: {
    id: string;
    creator: string;
    stakeAmount: string;
    totalStaked: string;
    startTime: number;
    endTime: number;
    status: string;
    condition: string;
    participants: string[];
  };
  onJoin: () => void;
}

const BetDisplay: React.FC<BetDisplayProps> = ({ bet, onJoin }) => {
  const isActive = bet.status === 'Active';
  const canJoin = bet.status === 'Created';
  const timeLeft = Math.max(0, bet.endTime - Math.floor(Date.now() / 1000));
  
  const formatTimeLeft = () => {
    const days = Math.floor(timeLeft / (24 * 60 * 60));
    const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{bet.condition}</h3>
          <p className="text-sm text-gray-500">Created by {formatAddress(bet.creator)}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${
          bet.status === 'Created' ? 'bg-blue-100 text-blue-800' :
          bet.status === 'Active' ? 'bg-green-100 text-green-800' :
          bet.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {bet.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Stake Amount</p>
          <p className="font-medium">{formatTokenAmount(bet.stakeAmount)}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Staked</p>
          <p className="font-medium">{formatTokenAmount(bet.totalStaked)}</p>
        </div>
        <div>
          <p className="text-gray-500">Participants</p>
          <p className="font-medium">{bet.participants.length}</p>
        </div>
        <div>
          <p className="text-gray-500">Time Left</p>
          <p className="font-medium">{timeLeft > 0 ? formatTimeLeft() : 'Ended'}</p>
        </div>
      </div>

      {canJoin && (
        <button
          onClick={onJoin}
          className="w-full mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Join Bet
        </button>
      )}
    </div>
  );
};

export default BetDisplay;
