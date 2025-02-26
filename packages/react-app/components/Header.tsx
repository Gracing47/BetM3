import React, { useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import WalletConnectModal from './WalletConnectModal';
import WalletInfo from './WalletInfo';

const Header: React.FC = () => {
  const { address, disconnect, isConnecting } = useWeb3();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span role="img" aria-label="dice" className="text-3xl">🎲</span>
                <span>BetM3</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {address ? (
                <>
                  <WalletInfo />
                  <button
                    onClick={disconnect}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={openModal}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 14C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12C15.4477 12 15 12.4477 15 13C15 13.5523 15.4477 14 16 14Z" fill="currentColor"/>
                  </svg>
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
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
