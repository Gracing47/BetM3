import React, { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ethers } from 'ethers';

const NetworkWarning: React.FC = () => {
  const { networkName } = useWeb3();
  const [isHardhatRunning, setIsHardhatRunning] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hardhatCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedRef = useRef<number>(0);

  useEffect(() => {
    const checkHardhatNode = async () => {
      // Only check every 30 seconds to avoid excessive RPC calls
      const now = Date.now();
      if (now - lastCheckedRef.current < 30000 && lastCheckedRef.current !== 0) {
        setIsLoading(false);
        return;
      }
      
      lastCheckedRef.current = now;
      setIsLoading(true);
      
      try {
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        await provider.getBlockNumber();
        setIsHardhatRunning(true);
      } catch (error) {
        console.error('Error connecting to Hardhat node:', error);
        setIsHardhatRunning(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Clear any existing timeout
    if (hardhatCheckTimeoutRef.current) {
      clearTimeout(hardhatCheckTimeoutRef.current);
    }
    
    // Schedule the check
    hardhatCheckTimeoutRef.current = setTimeout(checkHardhatNode, 100);
    
    // Cleanup function
    return () => {
      if (hardhatCheckTimeoutRef.current) {
        clearTimeout(hardhatCheckTimeoutRef.current);
      }
    };
  }, [networkName]);

  if (isLoading || isHardhatRunning !== false) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 p-4 border-t border-yellow-200 z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="mb-3 md:mb-0">
          <span className="font-bold text-yellow-800">⚠️ Hardhat Warning:</span>
          <span className="ml-2 text-yellow-700">
            Could not connect to Hardhat node. Make sure it's running with:
          </span>
        </div>
        <div className="flex flex-col">
          <code className="bg-yellow-50 px-3 py-2 rounded text-yellow-900 font-mono text-sm mb-2">
            cd /path/to/project-root
          </code>
          <code className="bg-yellow-50 px-3 py-2 rounded text-yellow-900 font-mono text-sm">
            npx hardhat node
          </code>
        </div>
      </div>
    </div>
  );
};

export default NetworkWarning; 