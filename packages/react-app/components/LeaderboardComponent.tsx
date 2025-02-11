import React from 'react';

const LeaderboardComponent: React.FC = () => {
  return (
    <div className="leaderboard">
      <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
      <div className="space-y-2">
        <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
          <span className="font-medium">🥇 User 1</span>
          <span className="text-gray-600">100 points</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
          <span className="font-medium">🥈 User 2</span>
          <span className="text-gray-600">90 points</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
          <span className="font-medium">🥉 User 3</span>
          <span className="text-gray-600">80 points</span>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardComponent;
