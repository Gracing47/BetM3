import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { formatTokenAmount } from '../utils/format';

interface YieldDisplayProps {
  betId?: string;
  initialStake?: string;
  startTime?: number;
}

const YieldDisplay: React.FC<YieldDisplayProps> = ({ 
  betId, 
  initialStake = "1.0", 
  startTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60 // Default to 7 days ago
}) => {
  const [estimatedYield, setEstimatedYield] = useState<string>('0');
  const [yieldPercentage, setYieldPercentage] = useState<number>(0);
  const [impermanentLoss, setImpermanentLoss] = useState<string>('0');
  const [impermanentLossPercentage, setImpermanentLossPercentage] = useState<number>(0);
  const [netYield, setNetYield] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);

  // Simulierte Daten für die Demonstration
  useEffect(() => {
    // In einer echten Implementierung würden wir diese Daten vom Smart Contract abrufen
    const calculateYield = () => {
      setLoading(true);
      
      // Berechne die verstrichene Zeit in Tagen
      const now = Math.floor(Date.now() / 1000);
      const elapsedSeconds = now - startTime;
      const elapsedDays = elapsedSeconds / (24 * 60 * 60);
      
      // Simuliere eine jährliche Rendite von 5%
      const annualYieldRate = 0.05;
      const dailyYieldRate = annualYieldRate / 365;
      
      // Berechne die geschätzte Rendite
      const initialStakeNumber = parseFloat(initialStake);
      const estimatedYieldValue = initialStakeNumber * dailyYieldRate * elapsedDays;
      const yieldPercentageValue = (estimatedYieldValue / initialStakeNumber) * 100;
      
      // Simuliere Impermanent Loss basierend auf der Zeit
      // In einer echten Implementierung würde dies auf Preisänderungen basieren
      const impermanentLossRate = 0.01; // 1% Verlust
      const impermanentLossValue = initialStakeNumber * impermanentLossRate * Math.min(elapsedDays, 10) / 10;
      const impermanentLossPercentageValue = (impermanentLossValue / initialStakeNumber) * 100;
      
      // Berechne den Nettoertrag
      const netYieldValue = Math.max(0, estimatedYieldValue - impermanentLossValue);
      
      // Aktualisiere den State
      setEstimatedYield(estimatedYieldValue.toFixed(6));
      setYieldPercentage(yieldPercentageValue);
      setImpermanentLoss(impermanentLossValue.toFixed(6));
      setImpermanentLossPercentage(impermanentLossPercentageValue);
      setNetYield(netYieldValue.toFixed(6));
      setLoading(false);
    };
    
    calculateYield();
    
    // Aktualisiere die Berechnung alle 60 Sekunden
    const interval = setInterval(calculateYield, 60000);
    
    return () => clearInterval(interval);
  }, [initialStake, startTime]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">Yield Information</h3>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Initial Stake</p>
              <p className="text-xl font-semibold">{formatTokenAmount(initialStake, 'CELO')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Time in Pool</p>
              <p className="text-xl font-semibold">
                {Math.floor((Date.now() / 1000 - startTime) / (24 * 60 * 60))} days
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm text-gray-500">Estimated Yield</p>
                <p className="text-sm font-medium text-green-600">+{yieldPercentage.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(yieldPercentage * 5, 100)}%` }}
                ></div>
              </div>
              <p className="text-right mt-1 text-sm">{formatTokenAmount(estimatedYield, 'CELO')}</p>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <p className="text-sm text-gray-500">Impermanent Loss</p>
                <p className="text-sm font-medium text-red-600">-{impermanentLossPercentage.toFixed(2)}%</p>
              </div>
              <div className="bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-red-500 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(impermanentLossPercentage * 5, 100)}%` }}
                ></div>
              </div>
              <p className="text-right mt-1 text-sm">{formatTokenAmount(impermanentLoss, 'CELO')}</p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between mb-1">
                <p className="font-medium">Net Yield</p>
                <p className="font-medium text-blue-600">
                  {parseFloat(netYield) > 0 ? '+' : ''}{(parseFloat(netYield) / parseFloat(initialStake) * 100).toFixed(2)}%
                </p>
              </div>
              <p className="text-right text-lg font-semibold">{formatTokenAmount(netYield, 'CELO')}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">How it works</h4>
            <p className="text-sm text-blue-700">
              Your stake is deposited into a Uniswap liquidity pool to generate yield through trading fees.
              Impermanent loss occurs when the relative price of the tokens in the pool changes.
              BetM3 ensures you always get at least your original stake back, even if impermanent loss exceeds yield.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default YieldDisplay; 