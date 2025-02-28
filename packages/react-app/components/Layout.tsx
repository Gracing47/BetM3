import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import ContractAddressManager from './ContractAddressManager';
import { useWeb3 } from '../contexts/web3Context';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { address } = useWeb3();
  const [showAdmin, setShowAdmin] = useState(false);

  // Listen for custom event from Header component
  useEffect(() => {
    const handleAdminToggle = (e: CustomEvent) => {
      setShowAdmin(e.detail.show);
    };

    window.addEventListener('adminPanelToggle' as any, handleAdminToggle as any);
    
    return () => {
      window.removeEventListener('adminPanelToggle' as any, handleAdminToggle as any);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      
      {/* Admin Panel */}
      {showAdmin && address && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900">Admin Tools</h3>
                <button 
                  onClick={() => setShowAdmin(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              <ContractAddressManager />
            </div>
          </div>
        </div>
      )}
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
