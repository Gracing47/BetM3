import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { BetCreation } from '../components/BetCreation';
import { ActiveBets } from '../components/ActiveBets';
import YieldDisplay from '../components/YieldDisplay';
import CELOMinter from '../components/CELOMinter';

export default function Home() {
  const { address, getUserAddress, disconnect, isConnecting, networkName, switchToCelo } = useWeb3();
  const [activeTab, setActiveTab] = useState<'create' | 'active' | 'yield' | 'mint'>('create');
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Überprüfe, ob das richtige Netzwerk verwendet wird
  useEffect(() => {
    if (address) {
      const isCeloNetwork = networkName.includes('Celo') || networkName.includes('Hardhat');
      setIsWrongNetwork(!isCeloNetwork);
    }
  }, [address, networkName]);

  const handleConnect = async () => {
    try {
      await getUserAddress();
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToCelo();
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">BetM3</h1>
            <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">No-Loss Betting</span>
          </div>
          
          <div className="flex items-center gap-4">
            {address && (
              <span className="text-sm text-gray-600">
                {networkName && (
                  <span className={`px-2 py-1 rounded-full text-xs mr-2 ${
                    networkName.includes('Celo') || networkName.includes('Hardhat')
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {networkName}
                  </span>
                )}
                {address.substring(0, 6)}...{address.substring(address.length - 4)}
              </span>
            )}
            
            {isWrongNetwork && address ? (
              <button
                onClick={handleSwitchNetwork}
                className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
              >
                Switch to Celo
              </button>
            ) : address ? (
              <button
                onClick={disconnect}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!address ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to BetM3</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              The first no-loss betting platform on Celo. Create bets, stake your tokens, and earn yield while betting with friends.
              Connect your wallet to get started.
            </p>
            <button
              onClick={handleConnect}
              className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Connect Wallet
            </button>
          </div>
        ) : isWrongNetwork ? (
          <div className="text-center py-12">
            <div className="bg-amber-50 p-6 rounded-lg max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-amber-800 mb-4">Wrong Network Detected</h2>
              <p className="text-amber-700 mb-6">
                BetM3 runs on the Celo network. Please switch to Celo to use this application.
              </p>
              <button
                onClick={handleSwitchNetwork}
                className="px-6 py-3 bg-amber-500 text-white rounded-md hover:bg-amber-600"
              >
                Switch to Celo Network
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b mb-6">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'create'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Bet
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'active'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Active Bets
              </button>
              <button
                onClick={() => setActiveTab('yield')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'yield'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Yield Info
              </button>
              <button
                onClick={() => setActiveTab('mint')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'mint'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Get Test CELO
              </button>
            </div>

            {/* Tab Content */}
            <div className="mb-8">
              {activeTab === 'create' && <BetCreation onBetCreated={handleRefresh} />}
              {activeTab === 'active' && <ActiveBets key={refreshTrigger} />}
              {activeTab === 'yield' && <YieldDisplay />}
              {activeTab === 'mint' && <CELOMinter />}
            </div>

            {/* Platform Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">How BetM3 Works</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="font-medium text-blue-800 mb-2">1. Create or Join a Bet</h3>
                  <p className="text-sm text-blue-700">
                    Create a bet by staking CELO tokens and defining a condition, or join an existing bet by matching the stake.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-md">
                  <h3 className="font-medium text-green-800 mb-2">2. Generate Yield</h3>
                  <p className="text-sm text-green-700">
                    Your stake is deposited into a Uniswap liquidity pool to generate yield through trading fees.
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-md">
                  <h3 className="font-medium text-purple-800 mb-2">3. Resolve & Collect</h3>
                  <p className="text-sm text-purple-700">
                    Both parties submit the outcome. The winner receives the yield, while both get their original stake back.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} BetM3 - No-Loss Betting Platform on Celo
          </p>
        </div>
      </footer>
    </div>
  );
}
