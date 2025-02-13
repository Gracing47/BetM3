import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Bet Manager. Built on Celo.
          </div>
          <div className="flex gap-4">
            <a
              href="https://docs.celo.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-primary"
            >
              Celo Docs
            </a>
            <a
              href="https://faucet.celo.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-primary"
            >
              Get Test Tokens
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
