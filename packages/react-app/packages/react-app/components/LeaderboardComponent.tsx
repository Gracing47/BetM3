import React from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { formatAddress } from '../utils/format';

const LeaderboardComponent: React.FC = () => {
  const { address } = useWeb3();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
      <div className="space-y-2">
        <div className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center ${
          address === '0x1234...5678' ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}>
          <span className="font-medium flex items-center gap-2">
            <span>🥇</span>
            <span className="font-mono text-sm">0x1234...5678</span>
            {address === '0x1234...5678' && (
              <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded">You</span>
            )}
          </span>
          <span className="text-gray-600">100 points</span>
        </div>
        <div className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center ${
          address === '0x9876...5432' ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}>
          <span className="font-medium flex items-center gap-2">
            <span>🥈</span>
            <span className="font-mono text-sm">0x9876...5432</span>
            {address === '0x9876...5432' && (
              <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded">You</span>
            )}
          </span>
          <span className="text-gray-600">90 points</span>
        </div>
        <div className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center ${
          address === '0x5432...1098' ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}>
          <span className="font-medium flex items-center gap-2">
            <span>🥉</span>
            <span className="font-mono text-sm">0x5432...1098</span>
            {address === '0x5432...1098' && (
              <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded">You</span>
            )}
          </span>
          <span className="text-gray-600">80 points</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <button
          onClick={() => document.getElementById('bet-creation')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-primary text-sm hover:underline"
        >
          Create a bet to join the leaderboard →
        </button>
      </div>
    </div>
  );
};

export default LeaderboardComponent;
