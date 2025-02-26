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
      {/* Hauptinhalt */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Netzwerkwarnung */}
        {isWrongNetwork && address && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You are connected to the wrong network. Please switch to Celo network.
                  <button
                    onClick={handleSwitchNetwork}
                    className="ml-2 font-medium text-yellow-700 underline"
                  >
                    Switch Network
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="sm:hidden">
            <label htmlFor="tabs" className="sr-only">Select a tab</label>
            <select
              id="tabs"
              name="tabs"
              className="block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
            >
              <option value="create">Create Bet</option>
              <option value="active">Active Bets</option>
              <option value="yield">Yield</option>
              <option value="mint">Get Test CELO</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {[
                  { name: 'Create Bet', value: 'create' },
                  { name: 'Active Bets', value: 'active' },
                  { name: 'Yield', value: 'yield' },
                  { name: 'Get Test CELO', value: 'mint' }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value as any)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.value
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {!address ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connect your wallet to get started</h3>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'create' && <BetCreation onBetCreated={handleRefresh} />}
              {activeTab === 'active' && <ActiveBets refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />}
              {activeTab === 'yield' && <YieldDisplay />}
              {activeTab === 'mint' && <CELOMinter />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
