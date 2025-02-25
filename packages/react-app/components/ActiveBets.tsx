import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from "../contexts/useWeb3";
import BetDisplay from "./BetDisplay";
import { formatTokenAmount } from "../utils/format";
import { ethers } from 'ethers';
import { NoLossBetABI } from "../abis/generated";

// Füge die Contract-Adresse hinzu
const NO_LOSS_BET_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";

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
  status: 'Created' | 'Active' | 'Completed' | 'Cancelled';
}

interface BetEvent {
  betId: string;
  creator: string;
  amount: string;
  condition: string;
}

export const ActiveBets = () => {
  const { acceptBet, getBet, address, approveToken } = useWeb3();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'created' | 'active' | 'completed'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshBets = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const loadBetsFromEvents = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        const noLossBet = new ethers.Contract(
          NO_LOSS_BET_ADDRESS,
          NoLossBetABI,
          provider
        );

        // Get block number for filtering
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000); // Reduziere den Block-Bereich für lokale Tests
        console.log("Searching for events from block", fromBlock, "to", currentBlock);

        // Get past BetCreated events
        const filter = noLossBet.filters.BetCreated();
        const events = await noLossBet.queryFilter(filter, fromBlock, currentBlock);
        console.log("Found events:", events);

        if (events.length === 0) {
          console.log("No events found in the specified block range");
          return;
        }

        const betPromises = events.map(async (event: any) => {
          try {
            const betId = event.args[0]; // First argument is betId
            console.log("Processing bet ID:", betId.toString());

            const betDetails = await noLossBet.getBet(betId);
            console.log("Got details for bet", betId.toString(), ":", betDetails);

            // Skip if bet doesn't exist
            if (!betDetails || !betDetails.creator) {
              console.log("No valid details found for bet:", betId.toString());
              return null;
            }

            // Determine status based on bet details
            let status: 'Created' | 'Active' | 'Completed' | 'Cancelled' = 'Created';
            if (betDetails.opponent !== ethers.ZeroAddress) {
              status = 'Active';
            }
            if (betDetails.resolved) {
              status = 'Completed';
            }
            if (betDetails.expirationTime < Math.floor(Date.now() / 1000)) {
              status = 'Cancelled';
            }

            return {
              id: betId.toString(),
              creator: betDetails.creator,
              opponent: betDetails.opponent,
              amount: betDetails.amount.toString(),
              condition: betDetails.condition,
              creatorOutcome: betDetails.creatorOutcome,
              opponentOutcome: betDetails.opponentOutcome,
              resolved: betDetails.resolved,
              expirationTime: Number(betDetails.expirationTime),
              status
            };
          } catch (err) {
            console.error("Error processing bet:", event, err);
            return null;
          }
        });

        const loadedBets = await Promise.all(betPromises);
        const validBets = loadedBets.filter((bet): bet is Bet => bet !== null);
        console.log("Valid bets loaded:", validBets);

        // Sort bets by creation time (newest first)
        const sortedBets = validBets.sort((a, b) => b.expirationTime - a.expirationTime);
        setBets(sortedBets);
      } catch (err) {
        console.error("Error loading bets from events:", err);
        setError("Failed to load bets. Please try again later.");
      }
    };

    if (address) {
      loadBetsFromEvents();
    }
  }, [address, refreshTrigger]);

  const handleJoinBet = async (bet: Bet) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(prev => ({ ...prev, [bet.id]: true }));
    setError(null);

    try {
      // First approve token spending
      const approveTx = await approveToken(bet.amount);
      await approveTx.wait();

      // Then join the bet
      const tx = await acceptBet(bet.id);
      await tx.wait();

      // Refresh all bets
      refreshBets();
    } catch (err) {
      console.error("Error joining bet:", err);
      setError("Failed to join bet. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, [bet.id]: false }));
    }
  };

  // Handler for when a bet is updated (outcome submitted or resolved)
  const handleBetUpdated = useCallback(() => {
    refreshBets();
  }, [refreshBets]);

  // Filter bets based on status
  const filteredBets = bets.filter(bet => {
    if (filter === 'all') return true;
    if (filter === 'created') return bet.status === 'Created';
    if (filter === 'active') return bet.status === 'Active';
    if (filter === 'completed') return bet.status === 'Completed';
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
            bet={bet}
            onJoin={() => handleJoinBet(bet)}
            onBetUpdated={handleBetUpdated}
          />
        ))}

        {filteredBets.length === 0 && (
          <div className="col-span-2 bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-gray-600 mb-2">No bets found.</p>
            <p className="text-gray-500 text-sm">
              {filter === 'all' 
                ? 'Create a new bet to get started!'
                : `No ${filter} bets found. Try a different filter.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
