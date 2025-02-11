import { useWeb3 } from "@/contexts/useWeb3";
import { useEffect, useState } from "react";
import BetCreation from "@/components/BetCreation";
import ActiveBets from "@/components/ActiveBets";
import Layout from "@/components/Layout";
import BetDisplay from "@/components/BetDisplay";
import ProfileView from "@/components/ProfileView";
import LeaderboardComponent from "@/components/LeaderboardComponent";

export default function Home() {
  const { address, getUserAddress, getCUSDBalance } = useWeb3();
  const [walletError, setWalletError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const updateBalance = async () => {
    if (!address) return;
    try {
      const bal = await getCUSDBalance(address);
      setBalance(Number(bal) / 1e18 + " cUSD");
    } catch (err) {
      console.error("Error getting balance:", err);
    }
  };

  useEffect(() => {
    if (address) {
      updateBalance();
    } else {
      setBalance(null);
    }
  }, [address]);

  useEffect(() => {
    const init = async () => {
      try {
        const addr = await getUserAddress();
        if (!addr) {
          setWalletError("Please install a Web3 wallet like MetaMask or Valora to use this application");
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setWalletError("Error connecting to wallet. Please make sure you have a Web3 wallet installed.");
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            No-Loss Betting on Celo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create bets where everyone gets their stake back! Winner takes all stakes as reward.
          </p>
        </div>

        <div className="text-center mb-6">
          {walletError ? (
            <div className="text-red-500 font-medium">{walletError}</div>
          ) : address ? (
            <div className="space-y-2">
              <div className="inline-block px-4 py-2 bg-primaryLight rounded-lg shadow-sm">
                <span className="text-gray-900">Connected: </span>
                <span className="font-mono text-sm">{address}</span>
              </div>
              {balance && (
                <div className="flex flex-col items-center space-y-1">
                  <div className="text-sm font-medium text-gray-900">Balance: {balance}</div>
                  <a 
                    href="https://celo.org/developers/faucet" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:text-opacity-80"
                  >
                    Get test cUSD from faucet
                  </a>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={getUserAddress}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <BetDisplay bets={[]} />
            </div>
            {address && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <BetCreation />
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <ActiveBets />
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <ProfileView />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <LeaderboardComponent />
            </div>
          </div>
        </div>
      </div>
  );
}
