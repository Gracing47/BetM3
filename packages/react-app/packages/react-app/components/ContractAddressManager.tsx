import React, { useState } from 'react';
import { useWeb3 } from '../contexts/useWeb3';

const ContractAddressManager: React.FC = () => {
  const { 
    getNoLossBetAddress, 
    getMockCELOAddress, 
    getCUSDTokenAddress,
    getBetM3TokenAddress,
    getUniswapPoolMockAddress,
    getLPTokenAddress
  } = useWeb3();

  const addresses = {
    noLossBet: getNoLossBetAddress(),
    mockCELO: getMockCELOAddress(),
    cUSDToken: getCUSDTokenAddress(),
    betM3Token: getBetM3TokenAddress(),
    uniswapPoolMock: getUniswapPoolMockAddress(),
    lpToken: getLPTokenAddress()
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Contract Addresses</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NoLossBet Contract
          </label>
          <input
            type="text"
            value={addresses.noLossBet}
            readOnly
            className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            MockCELO Token
          </label>
          <input
            type="text"
            value={addresses.mockCELO}
            readOnly
            className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            cUSD Token
          </label>
          <input
            type="text"
            value={addresses.cUSDToken}
            readOnly
            className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            BetM3 Token
          </label>
          <input
            type="text"
            value={addresses.betM3Token}
            readOnly
            className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Uniswap Pool Mock
          </label>
          <input
            type="text"
            value={addresses.uniswapPoolMock}
            readOnly
            className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LP Token
          </label>
          <input
            type="text"
            value={addresses.lpToken}
            readOnly
            className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50"
          />
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-4">
        These addresses are automatically loaded from the configuration file and will be updated after deployment.
      </p>
    </div>
  );
};

export default ContractAddressManager; 