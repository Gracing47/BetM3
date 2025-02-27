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
  const { address, getCELOBalance, disconnect } = useWeb3();
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState<string>('');

  const getAddressString = (addr: any): string | null => {
    console.log("Getting address string from:", addr, "type:", typeof addr);
    
    if (!addr) {
      console.log("No address provided");
      return null;
    }
    
    // If it's already a string but looks like "[object Object]" - this is a string representation of an object
    if (typeof addr === 'string') {
      // If it's a proper Ethereum address format
      if (addr.startsWith('0x')) {
        console.log("Valid Ethereum address string found:", addr);
        return addr;
      }
      
      // This is likely a string representation of an object, not a valid address
      if (addr === '[object Object]' || addr.includes('[object')) {
        console.error("Received string representation of an object instead of address:", addr);
        // Try to extract an address if it looks like a stringified object
        try {
          const parsedObj = JSON.parse(addr.replace('[object Object]', '{}'));
          if (parsedObj && typeof parsedObj === 'object' && 'address' in parsedObj) {
            return parsedObj.address;
          }
        } catch (e) {
          // Parsing failed, continue with other methods
        }
        return null;
      }
      
      return null;
    }
    
    // If it's an object with an address property (like a signer)
    if (typeof addr === 'object' && addr !== null) {
      // Check for address property
      if ('address' in addr && typeof addr.address === 'string') {
        console.log("Found address property in object:", addr.address);
        return addr.address;
      }
      
      // Try toString method 
      if (addr.toString && typeof addr.toString === 'function') {
        try {
          const str = addr.toString();
          // Only use if it looks like an Ethereum address
          if (str && typeof str === 'string' && str.startsWith('0x')) {
            console.log("Extracted address via toString:", str);
            return str;
          } else {
            console.error("toString did not return a valid address format:", str);
          }
        } catch (error) {
          console.error("Error calling toString on address:", error);
        }
      }
    }
    
    console.error("Could not extract a valid address from:", addr);
    return null;
  };

  // Format and store the address when it changes
  useEffect(() => {
    const addressStr = getAddressString(address);
    
    if (addressStr) {
      console.log("Using address string:", addressStr);
      const formatted = formatAddress(addressStr);
      setFormattedAddress(formatted);
    } else {
      console.log("No valid address found");
      setFormattedAddress('');
    }
  }, [address]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (address && showBalance) {
        try {
          setIsLoading(true);
          // Extract proper address string
          const addressStr = getAddressString(address);
          
          if (!addressStr) {
            console.error("Cannot get valid address for balance check");
            setBalance('0 CELO');
            setIsLoading(false);
            return;
          }
          
          const balanceBigInt = await getCELOBalance(addressStr);
          setBalance(formatTokenAmount(balanceBigInt.toString(), 'CELO'));
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance('0 CELO'); // Set a default value on error
        } finally {
          setIsLoading(false);
        }
      } else if (!address) {
        setBalance('0 CELO');
      }
    };

    fetchBalance();
    // Set up an interval to refresh the balance every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [address, getCELOBalance, showBalance]);

  const handleDisconnect = () => {
    console.log('Disconnecting wallet from WalletInfo component');
    // Reset local state before disconnect
    setBalance('0 CELO');
    setFormattedAddress('');
    setIsLoading(false);
    
    // Call the disconnect function from context
    disconnect();
    
    // Force rerender if needed
    setTimeout(() => {
      console.log('Forced UI update after disconnect');
    }, 100);
  };

  if (!address) {
    console.log("WalletInfo not rendering - no address");
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showNetworkIndicator && (
        <NetworkSelector />
      )}
      
      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
        <div className="h-2 w-2 bg-green-400 rounded-full"></div>
        <span className="text-sm font-medium text-gray-700">
          {formattedAddress || "Invalid Address"}
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
      
      <button
        onClick={handleDisconnect}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
};

export default WalletInfo; 