import React from 'react';
import { formatAddress } from '../utils/format';

interface Bet {
  id: string;
  participants: string[];
  stakeAmount: number;
  endTime: number;
  condition: string;
  status: 'Created' | 'Active' | 'Completed' | 'Cancelled';
}

interface BetDisplayProps {
  bet?: Bet;
  onJoin?: () => void;
}

const BetDisplay: React.FC<BetDisplayProps> = ({ bet, onJoin }) => {
  if (!bet) {
    return null;
  }

  const getTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    
    if (remaining <= 0) return 'Ended';
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const getProgressPercentage = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const duration = endTime - now;
    const elapsed = now - (endTime - duration);
    return Math.min(100, Math.max(0, (elapsed / duration) * 100));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold text-gray-800 truncate max-w-[70%]">
          {bet.condition}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm ${
          bet.status === 'Active' ? 'bg-green-100 text-green-800' :
          bet.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
          bet.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {bet.status}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Participants</p>
          <div className="flex flex-wrap gap-2">
            {bet.participants.map((address, i) => (
              <span 
                key={address} 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                title={address}
              >
                {formatAddress(address)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Stake Amount</p>
          <p className="text-xl font-semibold text-gray-800">{bet.stakeAmount} cUSD</p>
        </div>

        {bet.status === 'Active' && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Time Remaining</span>
              <span>{getTimeRemaining(bet.endTime)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercentage(bet.endTime)}%` }}
              />
            </div>
          </div>
        )}

        {onJoin && bet.status === 'Created' && (
          <button
            onClick={onJoin}
            className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors duration-200"
          >
            Join Bet
          </button>
        )}

        {bet.status === 'Created' && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/bet/${bet.id}`;
                navigator.clipboard.writeText(url);
              }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Bet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BetDisplay;
