import React from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { formatAddress } from '../utils/format';

const Header: React.FC = () => {
  const { address, getUserAddress, disconnect, isConnecting } = useWeb3();

  const handleConnect = async () => {
    try {
      await getUserAddress();
    } catch (err) {
      console.error('Error connecting wallet:', err);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span role="img" aria-label="dice" className="text-3xl">🎲</span>
              <span>BetM3</span>
            </div>
          </div>

          <div>
            {address ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                  {formatAddress(address)}
                </span>
                <button
                  onClick={disconnect}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
