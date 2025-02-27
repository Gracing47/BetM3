import React from 'react';
import { useWeb3 } from '../contexts/useWeb3';

interface NetworkSelectorProps {
  className?: string;
}

const NetworkSelector: React.FC<NetworkSelectorProps> = ({ className = '' }) => {
  const { networkName } = useWeb3();
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full">
        <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
        <span className="text-sm font-medium text-purple-700">
          {networkName}
        </span>
      </div>
    </div>
  );
};

export default NetworkSelector; 