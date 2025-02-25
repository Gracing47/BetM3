import React, { useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { formatAddress, formatTokenAmount } from '../utils/format';

interface Bet {
  id: string;
  creator: string;
  opponent: string;
  amount: string;
  condition: string;
  creatorOutcome: boolean | null;
  opponentOutcome: boolean | null;
  resolved: boolean;
  expirationTime: number;
}

interface BetResolutionProps {
  bet: Bet;
  onResolved: () => void;
}

const BetResolution: React.FC<BetResolutionProps> = ({ bet, onResolved }) => {
  const { submitOutcome, resolveBet, address } = useWeb3();
  const [selectedOutcome, setSelectedOutcome] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isCreator = address?.toLowerCase() === bet.creator.toLowerCase();
  const isOpponent = address?.toLowerCase() === bet.opponent.toLowerCase();
  const canSubmitOutcome = (isCreator || isOpponent) && !bet.resolved;
  
  const creatorHasSubmitted = bet.creatorOutcome !== null;
  const opponentHasSubmitted = bet.opponentOutcome !== null;
  const bothSubmitted = creatorHasSubmitted && opponentHasSubmitted;
  
  const canResolve = bothSubmitted && 
    bet.creatorOutcome === bet.opponentOutcome && 
    !bet.resolved;

  const isExpired = bet.expirationTime < Math.floor(Date.now() / 1000);

  const handleSubmitOutcome = async () => {
    if (selectedOutcome === null) {
      setError('Please select an outcome');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tx = await submitOutcome(bet.id, selectedOutcome);
      await tx.wait();
      setSuccess('Outcome submitted successfully!');
      onResolved(); // Refresh bet data
    } catch (err) {
      console.error('Error submitting outcome:', err);
      setError('Failed to submit outcome. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveBet = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tx = await resolveBet(bet.id);
      await tx.wait();
      setSuccess('Bet resolved successfully!');
      onResolved(); // Refresh bet data
    } catch (err) {
      console.error('Error resolving bet:', err);
      setError('Failed to resolve bet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4">Resolve Bet</h3>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-1">Condition:</p>
        <p className="font-medium">{bet.condition}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-gray-500">Creator</p>
          <p className="font-medium">{formatAddress(bet.creator)}</p>
          <p className="text-sm mt-1">
            {creatorHasSubmitted 
              ? `Submitted: ${bet.creatorOutcome ? 'True' : 'False'}` 
              : 'Not submitted yet'}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Opponent</p>
          <p className="font-medium">{formatAddress(bet.opponent)}</p>
          <p className="text-sm mt-1">
            {opponentHasSubmitted 
              ? `Submitted: ${bet.opponentOutcome ? 'True' : 'False'}` 
              : 'Not submitted yet'}
          </p>
        </div>
      </div>

      {canSubmitOutcome && !bet.resolved && (
        <div className="mb-6">
          <p className="text-gray-700 mb-2">Submit your outcome:</p>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedOutcome(true)}
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedOutcome === true
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              True
            </button>
            <button
              onClick={() => setSelectedOutcome(false)}
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedOutcome === false
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              False
            </button>
          </div>
          <button
            onClick={handleSubmitOutcome}
            disabled={loading || selectedOutcome === null}
            className="w-full mt-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Outcome'}
          </button>
        </div>
      )}

      {canResolve && (
        <div className="mb-6">
          <p className="text-gray-700 mb-2">Both parties agree on the outcome. You can now resolve the bet:</p>
          <button
            onClick={handleResolveBet}
            disabled={loading}
            className="w-full py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Resolving...' : 'Resolve Bet'}
          </button>
        </div>
      )}

      {isExpired && !bet.resolved && (
        <div className="mb-6">
          <p className="text-amber-600 mb-2">This bet has expired. You can claim your stake back:</p>
          <button
            onClick={handleResolveBet}
            disabled={loading}
            className="w-full py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Claim Stake'}
          </button>
        </div>
      )}

      {bet.resolved && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-green-700">This bet has been resolved.</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
          {success}
        </div>
      )}
    </div>
  );
};

export default BetResolution; 