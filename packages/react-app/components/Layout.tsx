import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import NetworkWarning from './NetworkWarning';
import ContractAddressRefresher from './ContractAddressRefresher';
import ContractAddressManager from './ContractAddressManager';
import { useWeb3 } from '../contexts/useWeb3';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { address } = useWeb3();
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NetworkWarning />
        
        {/* Admin Panel Toggle */}
        {address && (
          <div className="mb-4">
            <button 
              onClick={() => setShowAdmin(!showAdmin)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 transition-transform ${showAdmin ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showAdmin ? 'Hide Admin Tools' : 'Show Admin Tools'}
            </button>
            
            {/* Admin Panel */}
            {showAdmin && (
              <div className="mt-2 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Admin Tools</h3>
                <ContractAddressManager />
              </div>
            )}
          </div>
        )}
        
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
