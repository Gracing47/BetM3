import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { formatAddress, formatTokenAmount } from '../utils/format';
import NetworkSelector from './NetworkSelector';

interface WalletInfoProps {
  showBalance?: boolean;
  showNetworkIndicator?: boolean;
  className?: string;
}

const WalletInfo: React.FC<WalletInfoProps> = ({
  showBalance = true,
  showNetworkIndicator = true,
  className = '',
}) => {
  const { address, getCELOBalance } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (address && showBalance) {
        try {
          setIsLoading(true);
          const balanceBigInt = await getCELOBalance(address);
          setBalance(formatTokenAmount(balanceBigInt.toString(), 'CELO'));
        } catch (error) {
          console.error('Error fetching balance:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchBalance();
    // Set up an interval to refresh the balance every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [address, getCELOBalance, showBalance]);

  if (!address) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showNetworkIndicator && (
        <NetworkSelector />
      )}
      
      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
        <div className="h-2 w-2 bg-green-400 rounded-full"></div>
        <span className="text-sm font-medium text-gray-700">
          {formatAddress(address)}
        </span>
      </div>
      
      {showBalance && (
        <div className="bg-gray-100 px-3 py-1.5 rounded-full">
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-700">{balance}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletInfo; 