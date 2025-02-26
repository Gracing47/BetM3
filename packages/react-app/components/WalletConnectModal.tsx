import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ isOpen, onClose }) => {
  const { getUserAddress, isConnecting, networkName, switchToCelo } = useWeb3();
  const [error, setError] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsWrongNetwork(false);
    }
  }, [isOpen]);

  // Check if we're on the right network
  useEffect(() => {
    if (networkName && networkName !== 'Hardhat Local' && networkName !== 'Celo Alfajores Testnet' && networkName !== 'Celo Mainnet') {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [networkName]);

  const handleConnect = async () => {
    try {
      setError(null);
      await getUserAddress();
      onClose();
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      setError(null);
      await switchToCelo();
    } catch (err) {
      console.error('Error switching network:', err);
      setError('Failed to switch network. Please try manually in your wallet.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Connect your wallet to access BetM3 and start betting with your friends.
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {isWrongNetwork && (
            <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md mb-4">
              <p className="font-medium">Wrong network detected</p>
              <p className="text-sm mt-1">Please switch to Celo network to use this application.</p>
              <button
                onClick={handleSwitchNetwork}
                disabled={isConnecting}
                className="mt-2 w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                {isConnecting ? 'Switching...' : 'Switch to Celo Network'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition-colors"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 14C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12C15.4477 12 15 12.4477 15 13C15 13.5523 15.4477 14 16 14Z" fill="currentColor"/>
                  <path d="M12 12H3V10C3 8.89543 3.89543 8 5 8H19C20.1046 8 21 8.89543 21 10V12H12Z" fill="currentColor"/>
                </svg>
                <span>Connect with MetaMask</span>
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectModal; 