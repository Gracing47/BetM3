import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ethers } from 'ethers';

const NetworkWarning: React.FC = () => {
  const { networkName } = useWeb3();
  const [isHardhatRunning, setIsHardhatRunning] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHardhatNode = async () => {
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

    if (networkName === 'Hardhat Local') {
      checkHardhatNode();
    } else {
      setIsHardhatRunning(null);
      setIsLoading(false);
    }
  }, [networkName]);

  if (isLoading || isHardhatRunning !== false || networkName !== 'Hardhat Local') {
    return null;
  }

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
      <div className="flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div>
          <p className="font-bold">Hardhat Node Not Running</p>
          <p className="text-sm">
            The local Hardhat node is not running. Please start it with:
          </p>
          <pre className="bg-gray-800 text-white p-2 rounded mt-2 text-xs overflow-x-auto">
            npx hardhat node
          </pre>
          <p className="text-sm mt-2">
            Then deploy your contracts with:
          </p>
          <pre className="bg-gray-800 text-white p-2 rounded mt-2 text-xs overflow-x-auto">
            npx hardhat run --network localhost scripts/deploy.js
          </pre>
        </div>
      </div>
    </div>
  );
};

export default NetworkWarning; 