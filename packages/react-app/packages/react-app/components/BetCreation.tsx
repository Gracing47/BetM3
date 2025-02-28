import React, { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../contexts/useWeb3';
import { ethers } from 'ethers';
import Image from 'next/image';

interface FormData {
  stake: string;
  condition: string;
  duration: number;
  durationUnit: 'hours' | 'days';
  prediction: boolean | null;
  nftUrl: string;
}

interface BetCreationProps {
  onBetCreated?: () => void;
}

export const BetCreation: React.FC<BetCreationProps> = ({ onBetCreated }) => {
  const { createBet, address, getCELOBalance, mintCELO } = useWeb3();
  
  // State management
  const [formData, setFormData] = useState<FormData>({
    stake: '100',
    condition: '',
    duration: 14,
    durationUnit: 'days',
    prediction: null,
    nftUrl: ''
  });
  
  // UI state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's CELO balance when component mounts or address changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        try {
          setIsCheckingBalance(true);
          const balanceBigInt = await getCELOBalance(address);
          // Convert from wei to CELO
          const balanceInCELO = parseFloat(ethers.formatEther(balanceBigInt));
          setBalance(balanceInCELO.toString());
        } catch (error: any) {
          console.error('Error fetching balance:', error);
          // Set a default balance of 0 on error
          setBalance('0');
          // Show a helpful error message if appropriate
          if (!error.toString().includes('Hardhat node is not available')) {
            setError('Could not fetch your CELO balance. Make sure your Hardhat node is running.');
          }
        } finally {
          setIsCheckingBalance(false);
        }
      }
    };

    fetchBalance();
  }, [address, getCELOBalance]);

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user makes changes
    setError(null);
  };

  const handlePredictionChange = (prediction: boolean) => {
    setFormData(prev => ({ ...prev, prediction }));
    setError(null);
  };

  const handleDurationChange = (type: 'increment' | 'decrement') => {
    setFormData(prev => {
      let newDuration = prev.duration;
      
      if (type === 'increment') {
        newDuration += 1;
      } else {
        newDuration = Math.max(1, newDuration - 1);
      }
      
      return { ...prev, duration: newDuration };
    });
  };

  const handleDurationUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as 'hours' | 'days';
    
    setFormData(prev => {
      // Convert duration when changing units
      let newDuration = prev.duration;
      if (prev.durationUnit === 'days' && newUnit === 'hours') {
        newDuration = prev.duration * 24;
      } else if (prev.durationUnit === 'hours' && newUnit === 'days') {
        newDuration = Math.max(1, Math.floor(prev.duration / 24));
      }
      
      return {
        ...prev,
        duration: newDuration,
        durationUnit: newUnit
      };
    });
  };

  // NFT upload handlers
  const handleNftUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, nftUrl: url }));
    
    // Clear file preview if URL changes
    if (url && url !== formData.nftUrl) {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    // Check if file is an image
    if (!file.type.match('image.*')) {
      setError('Please upload an image file');
      return;
    }

    // Create URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFilePreview(e.target.result as string);
        // We would normally upload this to IPFS or similar and get a URL back
        // For now, we'll just use the filename as a placeholder
        setFormData(prev => ({ ...prev, nftUrl: file.name }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Validation and submission
  const validateForm = () => {
    if (!formData.stake || parseFloat(formData.stake) < 100) {
      setError('Stake must be at least 100 CELO');
      return false;
    }
    
    if (!formData.condition.trim()) {
      setError('Please enter a bet condition');
      return false;
    }
    
    if (formData.prediction === null) {
      setError('Please select Yes or No for your prediction');
      return false;
    }
    
    if (parseFloat(formData.stake) > parseFloat(balance)) {
      setError(`Insufficient balance. You need ${formData.stake} CELO, but only have ${parseFloat(balance).toFixed(2)} CELO`);
      return false;
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateForm()) {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
      handleCreateBet();
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleCreateBet = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stakeAmount = formData.stake;
      
      // Calculate duration in days
      const durationDays = (formData.durationUnit === 'hours' 
        ? (formData.duration / 24).toString() 
        : formData.duration.toString());
      
      // Get prediction
      const prediction = formData.prediction === true;
      
      // Create the bet
      const response = await createBet(
        stakeAmount,  // creator stake
        stakeAmount,  // opponent stake (same as creator for simplicity)
        formData.condition,
        durationDays,
        prediction
      );
      
      console.log("Bet created successfully:", response);
      setSuccess(true);
      
      // Reset form after successful creation
      setTimeout(() => {
        setFormData({
          stake: '100',
          condition: '',
          duration: 14,
          durationUnit: 'days',
          prediction: null,
          nftUrl: ''
        });
        setFilePreview(null);
        setStep(1);
        setSuccess(false);
        
        if (onBetCreated) {
          onBetCreated();
        }
      }, 5000);
    } catch (error: any) {
      console.error("Error creating bet:", error);
      setStep(1); // Go back to first step on error
      setError(error.message || "Failed to create bet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMintCELO = async () => {
    setIsMinting(true);
    setError(null);
    setMintSuccess(false);
    
    try {
      // Mint 200 CELO tokens (enough for creating a bet)
      await mintCELO('200');
      setMintSuccess(true);
      
      // Update balance after minting
      if (address) {
        setTimeout(async () => {
          const balanceBigInt = await getCELOBalance(address);
          const balanceInCELO = parseFloat(ethers.formatEther(balanceBigInt));
          setBalance(balanceInCELO.toString());
        }, 1000); // Small delay to ensure transaction is processed
      }
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setMintSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error minting CELO:', err);
      setError(err.message || 'Failed to mint CELO tokens. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  // Helper functions
  const getDurationDisplay = () => {
    if (formData.durationUnit === 'hours') {
      return `${formData.duration} hours`;
    } else {
      return `${formData.duration} days`;
    }
  };

  // Render progress bar
  const renderProgressBar = () => {
    return (
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <div className={`flex flex-col items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <span className="text-xs mt-1">Details</span>
          </div>
          <div className={`flex-1 border-t-2 self-center ${step >= 2 ? 'border-primary' : 'border-gray-200'}`}></div>
          <div className={`flex flex-col items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
            <span className="text-xs mt-1">Review</span>
          </div>
          <div className={`flex-1 border-t-2 self-center ${step >= 3 ? 'border-primary' : 'border-gray-200'}`}></div>
          <div className={`flex flex-col items-center ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
              3
            </div>
            <span className="text-xs mt-1">Confirm</span>
          </div>
        </div>
      </div>
    );
  };

  // Render form step
  const renderFormStep = () => {
    return (
      <div>
        <div className="mb-6">
          <label htmlFor="stake" className="block text-gray-700 font-medium mb-2">
            Your Stake (CELO)
          </label>
          <div className="relative">
            <input
              type="number"
              id="stake"
              name="stake"
              value={formData.stake}
              onChange={handleChange}
              placeholder="100"
              min="100"
              step="1"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary pr-16"
              disabled={isLoading}
            />
            <div className="absolute right-3 top-3 text-sm text-gray-500">
              CELO
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-sm text-gray-500">
              Minimum 100 CELO
            </p>
            <p className="text-sm text-gray-500">
              Your balance: {isCheckingBalance ? 'Loading...' : `${parseFloat(balance).toFixed(2)} CELO`}
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="condition" className="block text-gray-700 font-medium mb-2">
            Bet Condition
          </label>
          <textarea
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            placeholder="e.g., Will Bitcoin hit $100K by Dec?"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-24"
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500 mt-1">
            Clearly describe the condition that will determine the outcome of the bet.
          </p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            NFT Image
          </label>
          <div 
            className={`border-2 border-dashed rounded-md p-4 text-center ${isDragging ? 'border-primary bg-primary bg-opacity-5' : 'border-gray-300'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileClick}
          >
            {filePreview ? (
              <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden">
                <img 
                  src={filePreview} 
                  alt="NFT Preview" 
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="py-6 cursor-pointer">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-1 text-sm text-gray-500">Drag and drop an image, or click to select</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          
          <div className="mt-2">
            <label htmlFor="nftUrl" className="block text-sm text-gray-500 mb-1">
              Or enter image URL
            </label>
            <input
              type="text"
              id="nftUrl"
              name="nftUrl"
              value={formData.nftUrl}
              onChange={handleNftUrlChange}
              placeholder="https://example.com/image.jpg"
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Bet Duration
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => handleDurationChange('decrement')}
                className="p-2 border border-gray-300 rounded-l-md hover:bg-gray-100"
                disabled={isLoading || formData.duration <= 1}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                className="w-full p-3 border-y border-gray-300 text-center focus:outline-none focus:ring-0"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => handleDurationChange('increment')}
                className="p-2 border border-gray-300 rounded-r-md hover:bg-gray-100"
                disabled={isLoading}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            
            <select
              name="durationUnit"
              value={formData.durationUnit}
              onChange={handleDurationUnitChange}
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            The bet will run for {getDurationDisplay()} from the moment it is accepted.
          </p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Your Prediction
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handlePredictionChange(true)}
              className={`flex-1 py-3 px-4 rounded-md border ${
                formData.prediction === true
                  ? 'bg-green-100 border-green-500 text-green-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={isLoading}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => handlePredictionChange(false)}
              className={`flex-1 py-3 px-4 rounded-md border ${
                formData.prediction === false
                  ? 'bg-red-100 border-red-500 text-red-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              disabled={isLoading}
            >
              No
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Select whether you believe the condition will be true (Yes) or false (No).
          </p>
        </div>
        
        <div className="mt-8">
          <button
            type="button"
            onClick={handleNextStep}
            className="w-full py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
            disabled={isLoading}
          >
            Continue to Review
          </button>
        </div>
      </div>
    );
  };

  // Render review step
  const renderReviewStep = () => {
    return (
      <div>
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bet Summary</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Stake:</span>
              <span className="font-medium">{parseFloat(formData.stake).toFixed(2)} CELO</span>
            </div>
            
            <div className="flex justify-between items-start">
              <span className="text-gray-600">Condition:</span>
              <span className="font-medium text-right ml-4 max-w-[60%]">{formData.condition}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Your Prediction:</span>
              <span className={`font-medium ${formData.prediction ? 'text-green-600' : 'text-red-600'}`}>
                {formData.prediction !== null ? (formData.prediction ? 'Yes' : 'No') : '—'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{getDurationDisplay()}</span>
            </div>
            
            {(filePreview || formData.nftUrl) && (
              <div className="flex flex-col items-center pt-3 border-t border-gray-200">
                <span className="text-gray-600 mb-2 self-start">NFT Preview:</span>
                <div className="w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                  {filePreview ? (
                    <img 
                      src={filePreview} 
                      alt="NFT Preview" 
                      className="w-full h-full object-contain"
                    />
                  ) : formData.nftUrl ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      Image URL: {formData.nftUrl}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-blue-700">
            <strong>Note:</strong> Your stake will be invested in Uniswap to generate yield. You'll get your stake back regardless of the bet outcome!
          </p>
        </div>
        
        <div className="flex gap-3 mt-8">
          <button
            type="button"
            onClick={handlePrevStep}
            className="flex-1 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isLoading}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNextStep}
            className="flex-1 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            disabled={isLoading}
          >
            Create Bet
          </button>
        </div>
      </div>
    );
  };

  // Render confirmation step
  const renderConfirmationStep = () => {
    return (
      <div className="text-center py-10">
        {isLoading ? (
          <div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg font-medium text-gray-900">Creating Bet...</p>
            <p className="mt-2 text-gray-500">Please confirm the transaction in your wallet.</p>
          </div>
        ) : success ? (
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">Bet Created Successfully!</p>
            <p className="mt-2 text-gray-500">View it in the Active Bets section.</p>
            <button
              type="button"
              onClick={() => onBetCreated && onBetCreated()}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark"
            >
              View Active Bets
            </button>
          </div>
        ) : (
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">Something went wrong</p>
            <p className="mt-2 text-gray-500">{error || 'Failed to create bet. Please try again.'}</p>
            <button
              type="button"
              onClick={handlePrevStep}
              className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Review
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create a New Bet</h2>
      
      {renderProgressBar()}
      
      {/* Error Display */}
      {error && step !== 3 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('Insufficient') && (
                <button
                  onClick={handleMintCELO}
                  disabled={isMinting}
                  className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {isMinting ? 'Minting...' : 'Mint 200 CELO'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {mintSuccess && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4 flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>200 CELO tokens minted successfully! You can now create a bet.</span>
        </div>
      )}
      
      {/* Step Content */}
      {step === 1 && renderFormStep()}
      {step === 2 && renderReviewStep()}
      {step === 3 && renderConfirmationStep()}
    </div>
  );
};
