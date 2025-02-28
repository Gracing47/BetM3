import { ethers } from 'ethers';

/**
 * Formats an Ethereum address for display by showing the first 6 and last 4 characters
 * @param address The Ethereum address to format
 * @returns The formatted address (e.g., "0x1234...5678")
 */
export const formatAddress = (address: any): string => {
  if (!address) return '';
  
  // Handle case where address is an object
  let addressStr: string;
  if (typeof address === 'object' && address !== null) {
    // Try to extract address from object
    if (address.toString && typeof address.toString === 'function') {
      addressStr = address.toString();
      // Check if the result looks like an address
      if (!addressStr.startsWith('0x')) {
        // Try to get address property if toString didn't return an address
        if ('address' in address) {
          addressStr = address.address;
        } else {
          console.error('Unable to extract address from object:', address);
          return 'Invalid Address';
        }
      }
    } else if ('address' in address) {
      addressStr = address.address;
    } else {
      console.error('Unable to extract address from object:', address);
      return 'Invalid Address';
    }
  } else {
    addressStr = String(address);
  }
  
  if (addressStr.length < 10) return addressStr;
  return `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`;
};

/**
 * Formats a number to a human-readable string with specified decimal places
 * @param value The number to format
 * @param decimals Number of decimal places to show (default: 2)
 * @returns The formatted number as a string
 */
export const formatNumber = (value: number | string, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats a timestamp into a human-readable date string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

/**
 * Formats a duration in seconds to a human-readable string
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "2d 5h" or "3h 45m")
 */
export const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return 'Ended';
  
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Formats an amount of tokens to a human-readable string
 * @param amount The amount in wei
 * @param symbol The token symbol (e.g., "CELO")
 * @returns Formatted token amount string
 */
export const formatTokenAmount = (amount: string | number, symbol: string = ''): string => {
  try {
    // Always treat the input as wei and format it to CELO
    const formatted = ethers.formatUnits(amount.toString(), 18);
    // Format to 2 decimal places
    const value = parseFloat(formatted).toFixed(2);
    return symbol ? `${value} ${symbol}` : value;
  } catch (err) {
    console.error("Error formatting token amount:", err);
    return symbol ? `0 ${symbol}` : '0';
  }
};

// Add helper function to convert CELO to wei
export const toWei = (amount: string | number): string => {
  try {
    return ethers.parseUnits(amount.toString(), 18).toString();
  } catch (err) {
    console.error("Error converting to wei:", err);
    throw new Error("Invalid amount format");
  }
};
