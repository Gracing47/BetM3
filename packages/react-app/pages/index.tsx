import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { BetCreation } from '../components/BetCreation';
import { ActiveBets } from '../components/ActiveBets';
import YieldDisplay from '../components/YieldDisplay';
import CELOMinter from '../components/CELOMinter';
import { formatTokenAmount } from '../utils/format';
import Link from 'next/link';

export default function Dashboard() {
  const { 
    address, 
    getUserAddress,
    disconnect, 
    isConnecting, 
    networkName, 
    getCELOBalance
  } = useWeb3();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'active' | 'yield' | 'mint'>('dashboard');
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [celoBalance, setCeloBalance] = useState<string>('0');
  const [filterType, setFilterType] = useState<'all' | 'highest' | 'newest'>('all');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showConnectSuccess, setShowConnectSuccess] = useState(false);

  // Check if the correct network is being used
  useEffect(() => {
    if (address) {
      const isCorrectNetwork = networkName.includes('Celo') || networkName.includes('Hardhat');
      setIsWrongNetwork(!isCorrectNetwork);
    }
  }, [address, networkName]);

  // Fetch CELO balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        try {
          const balance = await getCELOBalance(address);
          setCeloBalance(balance.toString());
        } catch (error) {
          console.error('Failed to fetch CELO balance:', error);
        }
      }
    };

    fetchBalance();
    // Set up interval to refresh balance
    const intervalId = setInterval(fetchBalance, 30000); // every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [address, getCELOBalance, refreshTrigger]);

  const handleConnect = async () => {
    try {
      // Clear explicit disconnection flag when user chooses to connect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('WALLET_EXPLICITLY_DISCONNECTED');
      }
      
      await getUserAddress();
      // Refresh the balance after connecting
      if (address) {
        const balance = await getCELOBalance(address);
        setCeloBalance(balance.toString());
        // Show success message
        setShowConnectSuccess(true);
        // Hide after 3 seconds
        setTimeout(() => setShowConnectSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      // Show a toast or notification here if you have a UI component for it
    }
  };

  const handleSwitchNetwork = () => {
    alert("Please switch to the Celo network in your wallet manually.");
  };

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Success notification */}
      {showConnectSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-md flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Wallet connected successfully!</span>
        </div>
      )}
      
      {!address ? (
        /* Hero Section for Non-Connected Users */
        <div className="text-center py-20 px-4 sm:px-6 lg:px-8 bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl mb-4">
            Bet, Earn, Win
          </h1>
          <p className="max-w-xl mx-auto text-xl text-gray-500 mb-8">
            Stake CELO, Get It Back + Yield! No-loss betting on the Celo blockchain.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:scale-105"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          <div className="mt-8">
            <button 
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="text-primary hover:text-primary-dark font-medium flex items-center mx-auto"
            >
              <span>How It Works</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-1 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showHowItWorks && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg text-left max-w-3xl mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">How BetM3 Works:</h3>
                <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                  <li>Create a bet by staking CELO tokens</li>
                  <li>Your stake is put into a yield-generating protocol</li>
                  <li>Another user accepts your bet with their own stake</li>
                  <li>When the bet resolves, both parties get their original stake back</li>
                  <li>The winner gets most of the yield generated during the bet</li>
                  <li>You receive an NFT as proof of participation</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Dashboard for Connected Users */
        <>
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Hero Section for Connected Users */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Welcome to BetM3</h1>
                    <p className="mt-2 text-gray-600">
                      Your CELO Balance: <span className="font-medium">{formatTokenAmount(celoBalance)} CELO</span>
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveTab('create')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Create New Bet
                    </button>
                    <Link href="/bets" className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                      View All Bets
                    </Link>
                    {address && (
                      <Link href="/admin" className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Admin Panel
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Bets Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Active Bets</h2>
                  <div className="mt-3 sm:mt-0 flex space-x-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    >
                      <option value="all">All Bets</option>
                      <option value="highest">Highest Stake</option>
                      <option value="newest">Newest</option>
                    </select>
                    <button
                      onClick={handleRefresh}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>
                <ActiveBets refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
                <div className="mt-4 text-center">
                  <Link href="/bets" className="text-primary hover:text-primary-dark font-medium">
                    View All Bets →
                  </Link>
                </div>
              </div>

              {/* Your Bets Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Bets</h2>
                <ActiveBets 
                  refreshTrigger={refreshTrigger} 
                  onRefresh={handleRefresh} 
                  userOnly={true} 
                />
              </div>
            </div>
          )}

          {activeTab === 'create' && <BetCreation onBetCreated={handleRefresh} />}
          {activeTab === 'active' && <ActiveBets refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />}
          {activeTab === 'yield' && <YieldDisplay />}
          {activeTab === 'mint' && <CELOMinter />}
        </>
      )}

      {/* Navigation Tabs for Connected Users */}
      {address && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10 px-4 py-2">
          <div className="max-w-7xl mx-auto">
            <nav className="flex justify-around">
              {[
                { name: 'Dashboard', value: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                { name: 'Create Bet', value: 'create', icon: 'M12 4v16m8-8H4' },
                { name: 'All Bets', value: 'active', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                { name: 'Yield', value: 'yield', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                { name: 'Get CELO', value: 'mint', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value as any)}
                  className={`
                    flex flex-col items-center py-2 px-3 rounded-md
                    ${activeTab === tab.value
                      ? 'text-primary'
                      : 'text-gray-500 hover:text-gray-700'}
                  `}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={activeTab === tab.value ? 2 : 1.5} 
                      d={tab.icon} 
                    />
                  </svg>
                  <span className="text-xs mt-1">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

