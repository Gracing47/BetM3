import { useEffect, useState } from "react";
import { useWeb3 } from "../contexts/useWeb3";
import PrimaryButton from "./Button";

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
}

export const ActiveBets = () => {
  const { getBetDetails, addStake, approveToken, claimStake, address } = useWeb3();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  // In a real app, we would get this from events or a subgraph
  // For now, we'll use a dummy bet for testing
  useEffect(() => {
    const loadBets = async () => {
      try {
        // For testing, create a dummy bet ID
        const dummyBetId = "0x1234567890123456789012345678901234567890123456789012345678901234";
        const details = await getBetDetails(dummyBetId);
        setBets([{
          id: dummyBetId,
          creator: details[0],
          stakeAmount: details[1],
          totalStaked: details[2],
          startTime: details[3],
          endTime: details[4],
          status: details[5],
          condition: details[6],
          winner: details[7]
        }]);
      } catch (err) {
        console.error("Error loading bets:", err);
        setError("Failed to load bets");
      }
    };

    if (address) {
      loadBets();
    }
  }, [address, getBetDetails]);

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
      setBets(prev => prev.map(b => 
        b.id === bet.id 
          ? {
              ...b,
              totalStaked: updatedDetails[2],
              status: updatedDetails[5]
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

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 1e18).toString();
  };

  // Remove the early return since the wallet is already connected

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Active Bets</h2>
      
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      <div className="space-y-4 mt-4">
        {bets.map(bet => (
          <div key={bet.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Bet Condition</h3>
                <p className="text-gray-700">{bet.condition}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Details</h3>
                <div className="space-y-1 text-sm">
                  <p>Stake Amount: {formatAmount(bet.stakeAmount)} cUSD</p>
                  <p>Total Staked: {formatAmount(bet.totalStaked)} cUSD</p>
                  <p>End Time: {formatDate(bet.endTime)}</p>
                  <p>Status: {["Created", "Active", "Completed", "Cancelled"][bet.status]}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {bet.status === 0 && bet.creator !== address && (
                <PrimaryButton
                  title="Join Bet"
                  onClick={() => handleJoinBet(bet)}
                  disabled={loading[bet.id]}
                  loading={loading[bet.id]}
                  widthFull
                />
              )}
              {bet.status === 2 && ( // Completed status
                <PrimaryButton
                  title="Claim Stake"
                  onClick={() => handleClaimStake(bet)}
                  disabled={loading[bet.id]}
                  loading={loading[bet.id]}
                  widthFull
                />
              )}
            </div>
          </div>
        ))}

        {bets.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-600 mb-2">No active bets found.</p>
            <p className="text-gray-500 text-sm">Create a new bet using the form on the left to get started!</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ActiveBets;
