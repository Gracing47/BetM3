import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from "../contexts/useWeb3";
import BetDisplay from "./BetDisplay";
import JoinBetModal from "./JoinBetModal";
import { formatTokenAmount } from "../utils/format";
import { ethers } from 'ethers';
import { NoLossBetMultiABI } from "../abis/generated";

interface Bet {
  id: string;
  creator: string;
  condition: string;
  expirationTime: number;
  resolved: boolean;
  totalStakeTrue: string;
  totalStakeFalse: string;
  resolutionFinalized: boolean;
  winningOutcome: boolean;
  status: 'Created' | 'Active' | 'Expired' | 'Completed';
  commentText?: string; // Optional comment text
}

interface BetEvent {
  betId: string;
  creator: string;
  condition: string;
  expiration: string;
  creatorPrediction: boolean;
  creatorStake: string;
}

interface ActiveBetsProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
  userOnly?: boolean;
}

export const ActiveBets: React.FC<ActiveBetsProps> = ({ 
  refreshTrigger: externalRefreshTrigger, 
  onRefresh,
  userOnly = false
}) => {
  const { acceptBet, getBet, address, approveToken, getNoLossBetAddress } = useWeb3();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'created' | 'active' | 'completed'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

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
        
        // Get the NoLossBet address from the Web3 context
        const NO_LOSS_BET_ADDRESS = getNoLossBetAddress();
        console.log("Using NoLossBet address from Web3 context:", NO_LOSS_BET_ADDRESS);
        
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
          NoLossBetMultiABI,
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
                const betDetails = await noLossBet.getBetDetails(i);
                console.log(`Got details for bet ${i}:`, betDetails);
                
                if (betDetails && betDetails[0] !== ethers.ZeroAddress) {
                  // Determine status based on bet details
                  let status: 'Created' | 'Active' | 'Expired' | 'Completed' = 'Created';
                  
                  const creator = betDetails[0];            // creator
                  const condition = betDetails[1];          // condition
                  const expiration = Number(betDetails[2]); // expiration
                  const resolved = betDetails[3];           // resolved
                  const totalStakeTrue = betDetails[4].toString(); // totalStakeTrue
                  const totalStakeFalse = betDetails[5].toString(); // totalStakeFalse
                  const resolutionFinalized = betDetails[6]; // resolutionFinalized
                  const winningOutcome = betDetails[7];     // winningOutcome
                  
                  if (resolved) {
                    status = 'Completed';
                  } else if (expiration < Math.floor(Date.now() / 1000)) {
                    status = 'Expired';
                  } else if (totalStakeTrue !== '0' || totalStakeFalse !== '0') {
                    status = 'Active';
                  }
                  
                  directBets.push({
                    id: i.toString(),
                    creator,
                    condition,
                    expirationTime: expiration,
                    resolved,
                    totalStakeTrue,
                    totalStakeFalse,
                    resolutionFinalized,
                    winningOutcome,
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

  const handleJoinBet = async (betId: string, prediction: boolean, customStake?: string) => {
    setJoinError(null);
    
    try {
      // Pass parameters to acceptBet
      let result;
      if (customStake) {
        // If custom stake is provided
        console.log("Using custom stake");
        result = await acceptBet(betId, prediction, customStake);
      } else {
        // Use default stake
        console.log("Using default stake");
        result = await acceptBet(betId, prediction);
      }
      
      // No need to wait for tx.wait() as the acceptBet function already does that
      console.log("Bet joined successfully:", result);
      
      await refreshBets();
      setSelectedBet(null);
    } catch (error: any) {
      console.error("Error joining bet:", error);
      
      // Set a user-friendly error message
      let errorMessage = error.message || "Failed to join bet";
      
      // Handle specific error messages
      if (errorMessage.includes("You cannot accept your own bet")) {
        errorMessage = "You cannot join a bet that you created. Try joining someone else's bet.";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "You don't have enough CELO tokens to join this bet.";
      } else if (errorMessage.includes("user rejected transaction")) {
        errorMessage = "Transaction was cancelled.";
      } else if (errorMessage.includes("This bet has already been accepted")) {
        errorMessage = "This bet has already been accepted by another user. Please try a different bet.";
      }
      
      setJoinError(errorMessage);
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
      ) : bets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bets
            .filter(bet => !userOnly || (
              address && (
                bet.creator.toLowerCase() === address.toLowerCase() || 
                bet.opponent.toLowerCase() === address.toLowerCase()
              )
            ))
            .map((bet) => (
              <div key={bet.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <BetDisplay
                  bet={bet}
                  onJoin={() => setSelectedBet(bet)}
                  onBetUpdated={refreshBets}
                  isLoading={loading[bet.id]}
                />
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {userOnly ? "You don't have any bets yet" : "No bets found"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {userOnly ? "Create a new bet to get started!" : "Be the first to create a bet!"}
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.location.href = '#create'}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Bet
            </button>
          </div>
        </div>
      )}

      {/* Join Bet Modal */}
      {selectedBet && (
        <JoinBetModal
          bet={selectedBet}
          onClose={() => setSelectedBet(null)}
          onJoin={(prediction, customStake) => handleJoinBet(selectedBet.id, prediction, customStake)}
          isLoading={loading[selectedBet.id] || false}
        />
      )}
    </div>
  );
};
