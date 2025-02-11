import React from 'react';

interface Bet {
  id: string;
  participants: string[];
  stakeAmount: number;
  timeRemaining: string;
}

const BetDisplay: React.FC<{ bets: Bet[] }> = ({ bets }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bets.map((bet) => (
        <div key={bet.id} className="p-4 border rounded shadow">
          <h3 className="text-lg font-bold">Bet ID: {bet.id}</h3>
          <p>Participants: {bet.participants.join(', ')}</p>
          <p>Stake Amount: {bet.stakeAmount} cUSD</p>
          <p>Time Remaining: {bet.timeRemaining}</p>
        </div>
      ))}
    </div>
  );
};

export default BetDisplay;
