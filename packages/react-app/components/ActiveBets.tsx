import React, { useState, useEffect } from 'react';
import { useWeb3 } from "../contexts/useWeb3";
import BetDisplay from "./BetDisplay";
import { formatTokenAmount } from "../utils/format";
import { ethers } from 'ethers';
import { SimpleBetManagerABI } from "../abis/SimpleBetManagerABI";

// Füge die Contract-Adresse hinzu
const SIMPLE_BET_MANAGER_ADDRESS = "0x910273a1E3396e728CDe8B0748Fe1C0A36501BDA";

interface Bet {
  id: string;
  creator: string;
  stakeAmount: string;
  totalStaked: string;
  startTime: number;
  endTime: number;
  status: string;
  condition: string;
  participants: string[];
}

interface BetEvent {
  betId: string;
  creator: string;
  stakeAmount: string;
  endTime: number;
  condition: string;
}

const statusToString = (status: string): 'Created' | 'Active' | 'Completed' | 'Cancelled' => {
  const statuses = ['Created', 'Active', 'Completed', 'Cancelled'];
  return statuses[Number(status)] as 'Created' | 'Active' | 'Completed' | 'Cancelled';
};

export const ActiveBets = () => {
  const { getBetDetails, addStake, approveToken, claimStake, address, getBetParticipants } = useWeb3();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'created' | 'active' | 'completed'>('all');

  useEffect(() => {
    const loadBetsFromEvents = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://alfajores-forno.celo-testnet.org');
        const betManager = new ethers.Contract(
          SIMPLE_BET_MANAGER_ADDRESS,
          SimpleBetManagerABI.abi,
          provider
        );

        // Get block number for filtering
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000); // Increase block range
        console.log("Searching for events from block", fromBlock, "to", currentBlock);

        // Get past BetCreated events
        const filter = betManager.filters.BetCreated();
        const events = await betManager.queryFilter(filter, fromBlock, currentBlock);
        console.log("Found events:", events);

        if (events.length === 0) {
          console.log("No events found in the specified block range");
          return;
        }

        const betPromises = events.map(async (event: any) => {
          try {
            const betId = event.args[0]; // First argument is betId
            console.log("Processing bet ID:", betId.toString());

            const details = await betManager.getBetDetails(betId);
            console.log("Got details for bet", betId.toString(), ":", details);

            // Skip if bet doesn't exist
            if (!details || !details.creator) {
              console.log("No valid details found for bet:", betId.toString());
              return null;
            }

            let participants: string[] = [];
            try {
              participants = await betManager.getBetParticipants(betId);
              console.log("Got participants for bet", betId.toString(), ":", participants);
            } catch (err) {
              console.warn("Could not get participants for bet", betId.toString(), err);
            }

            // Convert status number to string
            const statusIndex = Number(details.status || 0);
            const status = ['Created', 'Active', 'Completed', 'Cancelled'][statusIndex];

            return {
              id: betId.toString(),
              creator: details.creator,
              stakeAmount: details.stakeAmount.toString(),
              totalStaked: details.totalStaked.toString(),
              startTime: Number(details.startTime),
              endTime: Number(details.endTime),
              status,
              condition: details.condition,
              participants,
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
        const sortedBets = validBets.sort((a, b) => b.startTime - a.startTime);
        setBets(sortedBets);
      } catch (err) {
        console.error("Error loading bets from events:", err);
        setError("Failed to load bets. Please try again later.");
      }
    };

    if (address) {
      loadBetsFromEvents();
    }
  }, [address]);

  const handleJoinBet = async (bet: Bet) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(prev => ({ ...prev, [bet.id]: true }));
    setError(null);

    try {
      // First approve token spending
      const approveTx = await approveToken(bet.stakeAmount);
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
              status: updatedDetails[6],
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
              status: updatedDetails[6]
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
