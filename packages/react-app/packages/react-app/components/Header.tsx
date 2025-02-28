import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWeb3 } from '../contexts/useWeb3';
import WalletConnectModal from './WalletConnectModal';
import { formatAddress } from '../utils/format';
import { useRouter } from 'next/router';

const Header: React.FC = () => {
  const router = useRouter();
  const { address, isConnecting, networkName, disconnect, connectWallet, getCELOBalance } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showDisconnectSuccess, setShowDisconnectSuccess] = useState(false);
  const [showConnectSuccess, setShowConnectSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

  // Lade den Kontostand, wenn die Adresse verfügbar ist
  useEffect(() => {
    if (address) {
      const fetchBalance = async () => {
        try {
          const balanceValue = await getCELOBalance(address);
          setBalance(Number(balanceValue).toFixed(2));
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      };
      fetchBalance();
    }
  }, [address, getCELOBalance]);

  // Verbindungsfunktion
  const handleConnect = async () => {
    setIsConnectingWallet(true);
    setError(null);
    
    try {
      await connectWallet();
      setShowConnectSuccess(true);
      
      // Blende die Erfolgsmeldung nach 3 Sekunden aus
      setTimeout(() => {
        setShowConnectSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Trennungsfunktion
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);
    
    try {
      await disconnect();
      setShowDisconnectConfirm(false);
      
      // Zeige die Erfolgsmeldung
      setShowDisconnectSuccess(true);
      
      // Blende die Erfolgsmeldung nach 3 Sekunden aus
      setTimeout(() => {
        setShowDisconnectSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error disconnecting wallet:", error);
      setError(error.message || 'Failed to disconnect wallet. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  const toggleAdminPanel = () => {
    const newState = !showAdminPanel;
    setShowAdminPanel(newState);
    
    // Dispatch custom event for Layout component
    const event = new CustomEvent('adminPanelToggle', { 
      detail: { show: newState } 
    });
    window.dispatchEvent(event);
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Disconnect success message */}
          {showDisconnectSuccess && (
            <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-md flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Wallet disconnected successfully!</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span role="img" aria-label="dice" className="text-3xl">🎲</span>
                <span>BetM3</span>
              </Link>
              
              {/* Navigation Links */}
              <nav className="ml-8 hidden md:flex space-x-6">
                <Link href="/" className={`text-sm font-medium ${router.pathname === '/' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}>
                  Home
                </Link>
                <Link href="/bets" className={`text-sm font-medium ${router.pathname === '/bets' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}>
                  Bets
                </Link>
                {address && (
                  <Link href="/admin" className={`text-sm font-medium ${router.pathname === '/admin' ? 'text-primary' : 'text-gray-500 hover:text-gray-900'}`}>
                    Admin
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {address ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">{formatAddress(address)}</span>
                    <span className="text-xs text-gray-500 border-l border-gray-300 pl-2">{networkName}</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Disconnect
                    </button>
                    
                    {/* Disconnect confirmation popup */}
                    {showDisconnectConfirm && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="p-3">
                          <p className="text-sm text-gray-700 mb-2">Are you sure you want to disconnect?</p>
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setShowDisconnectConfirm(false)}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleDisconnect}
                              disabled={isDisconnecting}
                              className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded flex items-center"
                            >
                              {isDisconnecting && (
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {address && (
                    <button
                      onClick={toggleAdminPanel}
                      className={`
                        text-sm text-gray-500 hover:text-gray-700 
                        ${showAdminPanel ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'} 
                        px-3 py-1.5 rounded-full transition-colors flex items-center gap-1
                      `}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={openModal}
                  disabled={isConnectingWallet}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isConnectingWallet ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 14C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12C15.4477 12 15 12.4477 15 13C15 13.5523 15.4477 14 16 14Z" fill="currentColor"/>
                      </svg>
                      Connect Wallet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <WalletConnectModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};

export default Header;
