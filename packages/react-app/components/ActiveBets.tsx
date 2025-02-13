import { useEffect, useState } from "react";
import { useWeb3 } from "../contexts/useWeb3";
import BetDisplay from "./BetDisplay";
import { formatTokenAmount } from "../utils/format";

interface Bet {
  id: string;
  creator: string;
  stakeAmount: bigint;
  totalStaked: bigint;
  startTime: bigint;
  endTime: bigint;
  status: number;
  condition: string;
  winner: string;
  participants: string[];
}

const statusToString = (status: number): 'Created' | 'Active' | 'Completed' | 'Cancelled' => {
  const statuses = ['Created', 'Active', 'Completed', 'Cancelled'];
  return statuses[status] as 'Created' | 'Active' | 'Completed' | 'Cancelled';
};

export const ActiveBets = () => {
  const { getBetDetails, addStake, approveToken, claimStake, address, getBetParticipants } = useWeb3();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'created' | 'active' | 'completed'>('all');

  useEffect(() => {
    const loadBets = async () => {
      try {
        // For testing, create a dummy bet ID
        const dummyBetId = "0x1234567890123456789012345678901234567890123456789012345678901234";
        const details = await getBetDetails(dummyBetId);
        const participants = await getBetParticipants(dummyBetId);
        
        setBets([{
          id: dummyBetId,
          creator: details[0],
          stakeAmount: details[1],
          totalStaked: details[2],
          startTime: details[3],
          endTime: details[4],
          status: details[5],
          condition: details[6],
          winner: details[7],
          participants
        }]);
      } catch (err) {
        console.error("Error loading bets:", err);
        setError("Failed to load bets");
      }
    };

    if (address) {
      loadBets();
    }
  }, [address, getBetDetails, getBetParticipants]);

  const handleJoinBet = async (bet: Bet) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(prev => ({ ...prev, [bet.id]: true }));
    setError(null);

    try {
      // First approve token spending
      const approveTx = await approveToken(bet.stakeAmount.toString());
      await approveTx.wait();

      // Then join the bet
      const tx = await addStake(bet.id);
      await tx.wait();

      // Refresh bet details
      const updatedDetails = await getBetDetails(bet.id);
      const participants = await getBetParticipants(bet.id);
      
      setBets(prev => prev.map(b => 
        b.id === bet.id 
          ? {
              ...b,
              totalStaked: updatedDetails[2],
              status: updatedDetails[5],
              participants
            }
          : b
      ));
    } catch (err) {
      console.error("Error joining bet:", err);
      setError("Failed to join bet. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, [bet.id]: false }));
    }
  };

  const handleClaimStake = async (bet: Bet) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(prev => ({ ...prev, [bet.id]: true }));
    setError(null);

    try {
      const tx = await claimStake(bet.id);
      await tx.wait();

      // Refresh bet details
      const updatedDetails = await getBetDetails(bet.id);
      setBets(prev => prev.map(b => 
        b.id === bet.id 
          ? {
              ...b,
              status: updatedDetails[5]
            }
          : b
      ));
    } catch (err) {
      console.error("Error claiming stake:", err);
      setError("Failed to claim stake. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, [bet.id]: false }));
    }
  };

  const filteredBets = bets.filter(bet => {
    if (filter === 'all') return true;
    if (filter === 'created') return bet.status === 0;
    if (filter === 'active') return bet.status === 1;
    if (filter === 'completed') return bet.status === 2;
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Active Bets</h2>
        
        <div className="flex gap-2">
          {(['all', 'created', 'active', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filteredBets.map(bet => (
          <BetDisplay
            key={bet.id}
            bet={{
              id: bet.id,
              participants: bet.participants,
              stakeAmount: Number(formatTokenAmount(bet.stakeAmount.toString())),
              endTime: Number(bet.endTime),
              condition: bet.condition,
              status: statusToString(bet.status)
            }}
            onJoin={() => handleJoinBet(bet)}
          />
        ))}

        {filteredBets.length === 0 && (
          <div className="col-span-2 bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-gray-600 mb-2">No bets found.</p>
            <p className="text-gray-500 text-sm">
              {filter === 'all' 
                ? 'Create a new bet to get started!'
                : `No ${filter} bets at the moment.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
