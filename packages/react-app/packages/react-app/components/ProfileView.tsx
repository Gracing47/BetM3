import React from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { formatAddress, formatTokenAmount } from '../utils/format';

const ProfileView: React.FC = () => {
  const { address, getCELOBalance } = useWeb3();
  const [balance, setBalance] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadBalance = async () => {
      if (address) {
        try {
          const bal = await getCELOBalance(address);
          // Format the balance from wei to CELO
          setBalance(formatTokenAmount(bal.toString(), 'CELO'));
        } catch (err) {
          console.error('Error loading balance:', err);
          setBalance("0 CELO");
        }
      }
    };
    loadBalance();
  }, [address, getCELOBalance]);

  if (!address) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-600">Connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Profile</h2>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Your Address</h3>
          <p className="text-gray-600 font-mono text-sm break-all">{formatAddress(address)}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">CELO Balance</h3>
          <p className="text-gray-600">
            {balance ? (
              <span className="font-mono">{balance}</span>
            ) : (
              <span className="text-gray-400">Loading...</span>
            )}
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Active Bets</h3>
          <div className="space-y-2">
            <p className="text-gray-600">No active bets</p>
            <button 
              onClick={() => document.getElementById('bet-creation')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-primary text-sm hover:underline"
            >
              Create a new bet →
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Past Bets</h3>
          <p className="text-gray-600">No past bets</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <a 
              href="https://faucet.celo.org/alfajores" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              Get test CELO from faucet →
            </a>
            <a 
              href="https://docs.celo.org/wallet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-primary hover:underline"
            >
              Learn about Celo wallets →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
