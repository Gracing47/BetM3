import React, { useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ isOpen, onClose }) => {
  const { connectWallet } = useWeb3();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Clear explicit disconnection flag when user chooses to connect
      localStorage.removeItem('WALLET_EXPLICITLY_DISCONNECTED');
      
      // Connect wallet
      await connectWallet();
      
      // Close modal on success
      onClose();
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Connect Wallet</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Connect your wallet to access all features of the BetM3 platform.
        </p>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-4 rounded-md font-medium flex items-center justify-center"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Connecting...
            </>
          ) : (
            'Connect with MetaMask'
          )}
        </button>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>By connecting, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectModal; 