import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from "../contexts/useWeb3";
import BetDisplay from "./BetDisplay";
import JoinBetModal from "./JoinBetModal";
import { formatTokenAmount } from "../utils/format";
import { ethers } from 'ethers';
import { NoLossBetABI } from "../abis/generated";

// Import the deployment addresses directly
let NO_LOSS_BET_ADDRESS = "0x0165878a594ca255338adfa4d48449f69242eb8f";

// Try to load from deployment file
try {
  const deploymentInfo = require('../deployment-localhost.json');
  if (deploymentInfo && deploymentInfo.addresses) {
    NO_LOSS_BET_ADDRESS = deploymentInfo.addresses.noLossBet;
    console.log("Loaded NoLossBet address from deployment file:", NO_LOSS_BET_ADDRESS);
  }
} catch (error) {
  console.warn("Could not load deployment-localhost.json, using hardcoded address:", NO_LOSS_BET_ADDRESS);
}

interface Bet {
  id: string;
  creator: string;
  opponent: string;
  amount: string;
  opponentStake: string;
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

interface ActiveBetsProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export const ActiveBets: React.FC<ActiveBetsProps> = ({ refreshTrigger: externalRefreshTrigger, onRefresh }) => {
  const { acceptBet, getBet, address, approveToken } = useWeb3();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'created' | 'active' | 'completed'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

  const refreshBets = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  useEffect(() => {
    const loadBetsFromEvents = async () => {
      try {
        setLoading(prev => ({ ...prev, all: true }));
        setError(null);

        // Get provider and contract
        if (!window.ethereum) {
          console.error("No ethereum provider found. Please install MetaMask or another wallet.");
          setError("No ethereum provider found. Please install MetaMask or another wallet.");
          setLoading(prev => ({ ...prev, all: false }));
          return;
        }
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        console.log("Provider initialized:", provider);
        
        // Check if the contract exists at the specified address
        try {
          const code = await provider.getCode(NO_LOSS_BET_ADDRESS);
          if (code === '0x') {
            console.error(`No contract found at address ${NO_LOSS_BET_ADDRESS}`);
            setError(`No contract found at address ${NO_LOSS_BET_ADDRESS}. Make sure contracts are deployed.`);
            setLoading(prev => ({ ...prev, all: false }));
            return;
          }
          console.log(`Contract verified at address: ${NO_LOSS_BET_ADDRESS} (bytecode length: ${code.length})`);
        } catch (contractError) {
          console.error("Contract verification failed:", contractError);
          setError(`Failed to verify contract at ${NO_LOSS_BET_ADDRESS}. Check if the address is correct and the Hardhat node is running.`);
          setLoading(prev => ({ ...prev, all: false }));
          return;
        }
        
        const noLossBet = new ethers.Contract(
          NO_LOSS_BET_ADDRESS,
          NoLossBetABI,
          provider
        );
        console.log("NoLossBet contract initialized at address:", NO_LOSS_BET_ADDRESS);

        // DIRECT APPROACH: First try to load bets directly using betCounter
        // This is the most reliable method
        try {
          console.log("DIRECT APPROACH: Loading bets directly using betCounter");
          const betCounter = await noLossBet.betCounter();
          console.log("BetCounter value:", betCounter.toString());
          
          if (betCounter > 0) {
            const directBets = [];
            
            for (let i = 0; i < betCounter; i++) {
              try {
                console.log(`Loading bet ${i} directly`);
                const betDetails = await noLossBet.bets(i);
                console.log(`Got details for bet ${i}:`, betDetails);
                
                if (betDetails && betDetails.creator !== ethers.ZeroAddress) {
                  // Determine status based on bet details
                  let status: 'Created' | 'Active' | 'Completed' | 'Cancelled' = 'Created';
                  if (betDetails.opponent !== ethers.ZeroAddress) {
                    status = 'Active';
                  }
                  if (betDetails.resolved) {
                    status = 'Completed';
                  }
                  if (betDetails.expiration < Math.floor(Date.now() / 1000)) {
                    status = 'Cancelled';
                  }
                  
                  directBets.push({
                    id: i.toString(),
                    creator: betDetails.creator,
                    opponent: betDetails.opponent,
                    amount: betDetails.creatorStake.toString(),
                    opponentStake: betDetails.opponentStake.toString(),
                    condition: betDetails.condition,
                    creatorOutcome: betDetails.creatorOutcome,
                    opponentOutcome: betDetails.opponentOutcome,
                    resolved: betDetails.resolved,
                    expirationTime: Number(betDetails.expiration),
                    status
                  });
                }
              } catch (betError) {
                console.error(`Error loading bet ${i}:`, betError);
              }
            }
            
            if (directBets.length > 0) {
              console.log("Directly loaded bets:", directBets);
              setBets(directBets);
              setLoading(prev => ({ ...prev, all: false }));
              return;
            }
          }
        } catch (directLoadError) {
          console.error("Error directly loading bets:", directLoadError);
          // Continue with event-based approaches
        }

        // Get block number for filtering
        const currentBlock = await provider.getBlockNumber();
        console.log("Current block number:", currentBlock);
        
        // For local development, we might need to search from the beginning
        const fromBlock = 0; // Start from the beginning for local development
        console.log("Searching for events from block", fromBlock, "to", currentBlock);

        // Try to get the betCounter value to see if there are any bets
        try {
          const betCounter = await noLossBet.betCounter();
          console.log("Current betCounter value:", betCounter.toString());
          
          if (betCounter.toString() === "0") {
            console.log("No bets have been created yet (betCounter is 0)");
            setLoading(prev => ({ ...prev, all: false }));
            return;
          }
        } catch (counterError) {
          console.error("Error getting betCounter:", counterError);
          // Continue anyway, as we'll try to get events
        }

        // Try to get past BetCreated events
        try {
          console.log("Creating filter for BetCreated events");
          const filter = noLossBet.filters.BetCreated();
          console.log("Created filter:", filter);
          
          console.log("Querying for events from block", fromBlock, "to", currentBlock);
          const events = await noLossBet.queryFilter(filter, fromBlock, currentBlock);
          console.log("Found events:", events.length);
          console.log("Event details:", events);

          if (events.length === 0) {
            console.log("No events found in the specified block range");
            
            // Try a different approach - query for all events from the contract
            try {
              console.log("Trying alternative approach - query for all events from the contract");
              const allEvents = await provider.getLogs({
                address: NO_LOSS_BET_ADDRESS,
                fromBlock: fromBlock,
                toBlock: currentBlock
              });
              
              console.log("All contract events:", allEvents.length, allEvents);
              
              if (allEvents.length > 0) {
                // Process all events to find BetCreated events
                const betCreatedEvents = [];
                
                for (const event of allEvents) {
                  try {
                    console.log("Processing event:", event);
                    console.log("Event topics:", event.topics);
                    
                    // Try to get bet details for each possible bet ID
                    for (let i = 0; i < 10; i++) {
                      try {
                        const betDetails = await noLossBet.bets(i);
                        console.log(`Checking bet ${i}:`, betDetails);
                        
                        if (betDetails && betDetails.creator !== ethers.ZeroAddress) {
                          // This is a valid bet
                          let status: 'Created' | 'Active' | 'Completed' | 'Cancelled' = 'Created';
                          if (betDetails.opponent !== ethers.ZeroAddress) {
                            status = 'Active';
                          }
                          if (betDetails.resolved) {
                            status = 'Completed';
                          }
                          if (betDetails.expiration < Math.floor(Date.now() / 1000)) {
                            status = 'Cancelled';
                          }
                          
                          betCreatedEvents.push({
                            id: i.toString(),
                            creator: betDetails.creator,
                            opponent: betDetails.opponent,
                            amount: betDetails.creatorStake.toString(),
                            opponentStake: betDetails.opponentStake.toString(),
                            condition: betDetails.condition,
                            creatorOutcome: betDetails.creatorOutcome,
                            opponentOutcome: betDetails.opponentOutcome,
                            resolved: betDetails.resolved,
                            expirationTime: Number(betDetails.expiration),
                            status
                          });
                        }
                      } catch (betError) {
                        console.error(`Error checking bet ${i}:`, betError);
                      }
                    }
                  } catch (eventError) {
                    console.error("Error processing event:", eventError);
                  }
                }
                
                if (betCreatedEvents.length > 0) {
                  console.log("Found bets from all events:", betCreatedEvents);
                  setBets(betCreatedEvents);
                  setLoading(prev => ({ ...prev, all: false }));
                  return;
                }
              }
            } catch (allEventsError) {
              console.error("Error getting all events:", allEventsError);
            }
          }
        } catch (eventsError) {
          console.error("Error getting events:", eventsError);
        }

        // If we couldn't get events or process logs, try to load bets directly using betCounter
        try {
          console.log("Attempting to load bets directly using betCounter");
          const betCounter = await noLossBet.betCounter();
          console.log("BetCounter value for direct loading:", betCounter.toString());
          
          if (betCounter > 0) {
            const directBets = [];
            
            for (let i = 0; i < betCounter; i++) {
              try {
                console.log(`Directly loading bet ${i}`);
                const betDetails = await noLossBet.bets(i);
                console.log(`Got details for bet ${i} directly:`, betDetails);
                
                if (betDetails && betDetails.creator !== ethers.ZeroAddress) {
                  // Determine status based on bet details
                  let status: 'Created' | 'Active' | 'Completed' | 'Cancelled' = 'Created';
                  if (betDetails.opponent !== ethers.ZeroAddress) {
                    status = 'Active';
                  }
                  if (betDetails.resolved) {
                    status = 'Completed';
                  }
                  if (betDetails.expiration < Math.floor(Date.now() / 1000)) {
                    status = 'Cancelled';
                  }
                  
                  directBets.push({
                    id: i.toString(),
                    creator: betDetails.creator,
                    opponent: betDetails.opponent,
                    amount: betDetails.creatorStake.toString(),
                    opponentStake: betDetails.opponentStake.toString(),
                    condition: betDetails.condition,
                    creatorOutcome: betDetails.creatorOutcome,
                    opponentOutcome: betDetails.opponentOutcome,
                    resolved: betDetails.resolved,
                    expirationTime: Number(betDetails.expiration),
                    status
                  });
                }
              } catch (betError) {
                console.error(`Error directly loading bet ${i}:`, betError);
              }
            }
            
            if (directBets.length > 0) {
              console.log("Directly loaded bets:", directBets);
              setBets(directBets);
              setLoading(prev => ({ ...prev, all: false }));
              return;
            }
          }
        } catch (directLoadError) {
          console.error("Error directly loading bets:", directLoadError);
        }
      } catch (err: any) {
        console.error("Error loading bets from events:", err);
        setError(`Failed to load bets: ${err.message}`);
      } finally {
        setLoading(prev => ({ ...prev, all: false }));
      }
    };

    if (address) {
      loadBetsFromEvents();
    }
  }, [address, refreshTrigger, externalRefreshTrigger]);

  const handleJoinBet = async (bet: Bet) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    // Check if opponent stake is at least 100 CELO
    const opponentStake = parseFloat(bet.opponentStake || bet.amount);
    if (opponentStake < 100) {
      setError("Minimum stake to join a bet is 100 CELO");
      return;
    }

    // Show the modal instead of immediately joining
    setSelectedBet(bet);
  };

  const handleConfirmJoin = async (prediction: boolean) => {
    if (!selectedBet) return;
    
    setLoading(prev => ({ ...prev, [selectedBet.id]: true }));
    setError(null);

    try {
      // First approve token spending
      const approveTx = await approveToken(selectedBet.opponentStake || selectedBet.amount);
      await approveTx.wait();

      // Then join the bet with the selected prediction
      const tx = await acceptBet(selectedBet.id, prediction);
      await tx.wait();

      // Close the modal
      setSelectedBet(null);

      // Refresh all bets
      refreshBets();
    } catch (err) {
      console.error("Error joining bet:", err);
      setError("Failed to join bet. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, [selectedBet.id]: false }));
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
        
        <div className="flex gap-2 items-center">
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
          
          <button
            onClick={refreshBets}
            disabled={loading.all}
            className="ml-2 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            title="Refresh bets"
          >
            <svg className={`h-5 w-5 ${loading.all ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading.all ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-gray-600">Loading bets...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredBets.map(bet => (
            <BetDisplay
              key={bet.id}
              bet={bet}
              onJoin={() => handleJoinBet(bet)}
              onBetUpdated={handleBetUpdated}
              isLoading={loading[bet.id] || false}
            />
          ))}

          {filteredBets.length === 0 && (
            <div className="col-span-2 bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-600 mb-2">No bets found.</p>
              <p className="text-gray-500 text-sm mb-4">
                {filter === 'all' 
                  ? 'Create a new bet to get started!'
                  : `No ${filter} bets found. Try a different filter.`}
              </p>
              <button 
                onClick={refreshBets}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm transition-colors"
              >
                <div className="flex items-center justify-center">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Join Bet Modal */}
      {selectedBet && (
        <JoinBetModal
          bet={selectedBet}
          onClose={() => setSelectedBet(null)}
          onJoin={(prediction) => handleConfirmJoin(prediction)}
          isLoading={loading[selectedBet.id] || false}
        />
      )}
    </div>
  );
};
