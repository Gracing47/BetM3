import React from 'react';
import { NextPage } from 'next';
import TestAcceptBet from '../components/TestAcceptBet';

const TestPage: NextPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Test Page</h1>
      <TestAcceptBet />
    </div>
  );
};

export default TestPage; 