import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ActiveBets } from '../components/ActiveBets';

const BetsPage: React.FC = () => {
  const { address } = useWeb3();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">All Bets</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : !address ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please connect your wallet to view all bets.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ActiveBets />
      )}
    </div>
  );
};

export default BetsPage; 