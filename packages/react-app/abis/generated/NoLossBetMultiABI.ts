export const NoLossBetMultiABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "betId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "condition",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "creatorPrediction",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "creatorStake",
        "type": "uint256"
      }
    ],
    "name": "BetCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "betId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "participant",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "prediction",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stake",
        "type": "uint256"
      }
    ],
    "name": "BetJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "betId",
        "type": "uint256"
      }
    ],
    "name": "BetResolutionCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "betId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "winningOutcome",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "simulatedYield",
        "type": "uint256"
      }
    ],
    "name": "BetResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "betId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "participant",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "outcome",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "voteWeight",
        "type": "uint256"
      }
    ],
    "name": "ResolutionVoteSubmitted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DEFAULT_BET_DURATION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_STAKE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "RESOLUTION_PERIOD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_betId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_winningOutcome",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "_cancel",
        "type": "bool"
      }
    ],
    "name": "adminFinalizeResolution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "betCounter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_stake",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_condition",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_durationDays",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_creatorPrediction",
        "type": "bool"
      }
    ],
    "name": "createBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_betId",
        "type": "uint256"
      }
    ],
    "name": "finalizeResolution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_betId",
        "type": "uint256"
      }
    ],
    "name": "getBetDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "condition",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "expiration",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "resolved",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "totalStakeTrue",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalStakeFalse",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "resolutionFinalized",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "winningOutcome",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_betId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_participant",
        "type": "address"
      }
    ],
    "name": "getParticipantStake",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_betId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_stake",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_prediction",
        "type": "bool"
      }
    ],
    "name": "joinBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_yieldRate",
        "type": "uint256"
      }
    ],
    "name": "setYieldRate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_betId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_outcome",
        "type": "bool"
      }
    ],
    "name": "submitResolutionOutcome",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "yieldRate",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
