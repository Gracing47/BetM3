import React, { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';

interface NetworkSelectorProps {
  className?: string;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({ className = '' }) => {
  const { networkName, switchToHardhat, switchToCelo, switchToCeloMainnet } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Schließe das Dropdown, wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNetworkSwitch = async (networkType: 'hardhat' | 'alfajores' | 'mainnet') => {
    setIsLoading(true);
    try {
      if (networkType === 'hardhat') {
        await switchToHardhat();
      } else if (networkType === 'alfajores') {
        await switchToCelo();
      } else if (networkType === 'mainnet') {
        await switchToCeloMainnet();
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  // Bestimme die Netzwerkfarbe
  let networkColor = 'bg-gray-400'; // Default
  let textColor = 'text-gray-700';
  let bgColor = 'bg-gray-100';
  
  if (networkName === 'Hardhat Local') {
    networkColor = 'bg-purple-400';
    textColor = 'text-purple-700';
    bgColor = 'bg-purple-50';
  } else if (networkName === 'Celo Alfajores Testnet') {
    networkColor = 'bg-yellow-400';
    textColor = 'text-yellow-700';
    bgColor = 'bg-yellow-50';
  } else if (networkName === 'Celo Mainnet') {
    networkColor = 'bg-green-400';
    textColor = 'text-green-700';
    bgColor = 'bg-green-50';
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 ${bgColor} px-3 py-1.5 rounded-full transition-colors hover:bg-opacity-80`}
      >
        <div className={`h-2 w-2 ${networkColor} rounded-full`}></div>
        <span className={`text-sm font-medium ${textColor}`}>
          {isLoading ? 'Switching...' : networkName}
        </span>
        <svg
          className={`h-4 w-4 ${textColor} transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={() => handleNetworkSwitch('hardhat')}
              className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm ${
                networkName === 'Hardhat Local' ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
              role="menuitem"
            >
              <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
              <span>Hardhat Local</span>
              {networkName === 'Hardhat Local' && (
                <svg className="ml-auto h-4 w-4 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={() => handleNetworkSwitch('alfajores')}
              className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm ${
                networkName === 'Celo Alfajores Testnet' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
              role="menuitem"
            >
              <div className="h-2 w-2 bg-yellow-400 rounded-full"></div>
              <span>Celo Alfajores Testnet</span>
              {networkName === 'Celo Alfajores Testnet' && (
                <svg className="ml-auto h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={() => handleNetworkSwitch('mainnet')}
              className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm ${
                networkName === 'Celo Mainnet' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
              role="menuitem"
            >
              <div className="h-2 w-2 bg-green-400 rounded-full"></div>
              <span>Celo Mainnet</span>
              {networkName === 'Celo Mainnet' && (
                <svg className="ml-auto h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkSelector; 