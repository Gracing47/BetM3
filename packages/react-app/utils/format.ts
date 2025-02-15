import { ethers } from 'ethers';

/**
 * Formats an Ethereum address for display by showing the first 6 and last 4 characters
 * @param address The Ethereum address to format
 * @returns The formatted address (e.g., "0x1234...5678")
 */
export const formatAddress = (address: string): string => {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
export const formatTokenAmount = (amount: string | number, symbol: string = 'CELO'): string => {
  try {
    // Always treat the input as wei and format it to CELO
    const formatted = ethers.formatUnits(amount.toString(), 18);
    // Format to 4 decimal places
    const value = parseFloat(formatted).toFixed(4);
    return `${value} ${symbol}`;
  } catch (err) {
    console.error("Error formatting token amount:", err);
    return `0 ${symbol}`;
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
