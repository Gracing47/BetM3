import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import StableTokenApprover from '../components/StableTokenApprover';

const AdminPage: React.FC = () => {
  const { address, getNoLossBetAddress } = useWeb3();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOwnership = async () => {
      try {
        setIsLoading(true);
        // In a real app, you would check if the current address is the owner of the contract
        // For now, we'll just assume any connected wallet can access this page
        setIsOwner(!!address);
      } catch (error) {
        console.error('Error checking ownership:', error);
        setIsOwner(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOwnership();
  }, [address]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : !address ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please connect your wallet to access the admin dashboard.
              </p>
            </div>
          </div>
        </div>
      ) : !isOwner ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                You do not have permission to access this page. Only the contract owner can access the admin dashboard.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Contract Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Contract Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">NoLossBet Contract Address</p>
                <p className="font-mono text-sm break-all">{getNoLossBetAddress()}</p>
              </div>
            </div>
          </div>
          
          {/* Stable Token Approver */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Approve Stable Tokens</h2>
            <StableTokenApprover />
          </div>
          
          {/* Statistics (Placeholder) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Platform Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total Bets Created</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total Value Locked</p>
                <p className="text-2xl font-bold">-- CELO</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total Yield Generated</p>
                <p className="text-2xl font-bold">-- CELO</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage; 