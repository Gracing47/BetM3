import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ isOpen, onClose }) => {
  const { getUserAddress, isConnecting } = useWeb3();
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    try {
      setError(null);
      await getUserAddress();
      onClose();
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again and make sure you are connected to Hardhat local network.');
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
            Connect your wallet to access BetM3 and start betting with your friends on the Hardhat local network.
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md mb-4">
            <p className="font-medium">Hardhat Network Only</p>
            <p className="text-sm mt-1">
              This application now exclusively supports Hardhat Local network. 
              Make sure your Hardhat node is running with <code className="bg-yellow-100 px-1 py-0.5 rounded">npx hardhat node</code>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect to MetaMask'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectModal; 