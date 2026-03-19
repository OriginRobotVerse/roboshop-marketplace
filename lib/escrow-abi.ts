export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT as `0x${string}`;

export const ESCROW_ABI = [
  {
    "type": "function",
    "name": "postBounty",
    "inputs": [
      { "name": "amount",          "type": "uint256" },
      { "name": "timeoutDuration", "type": "uint256" },
      { "name": "metadataUri",     "type": "string"  }
    ],
    "outputs": [{ "name": "bountyId", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submit",
    "inputs": [
      { "name": "bountyId",  "type": "uint256" },
      { "name": "skillUri",  "type": "string"  }
    ],
    "outputs": [{ "name": "submissionId", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "bountyId",     "type": "uint256" },
      { "name": "submissionId", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [{ "name": "bountyId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "previewSplit",
    "inputs": [{ "name": "bountyId", "type": "uint256" }],
    "outputs": [
      { "name": "devAmount", "type": "uint256" },
      { "name": "feeAmount", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "bounties",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "manufacturer",    "type": "address" },
      { "name": "amount",          "type": "uint256" },
      { "name": "metadataUri",     "type": "string"  },
      { "name": "deadline",        "type": "uint256" },
      { "name": "submissionCount", "type": "uint256" },
      { "name": "completed",       "type": "bool"    },
      { "name": "refunded",        "type": "bool"    }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "bountyCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "submissions",
    "inputs": [
      { "name": "", "type": "uint256" },
      { "name": "", "type": "uint256" }
    ],
    "outputs": [
      { "name": "dev",         "type": "address" },
      { "name": "skillUri",    "type": "string"  },
      { "name": "submittedAt", "type": "uint256" },
      { "name": "exists",      "type": "bool"    }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "BountyPosted",
    "inputs": [
      { "name": "bountyId",     "type": "uint256", "indexed": true  },
      { "name": "manufacturer", "type": "address", "indexed": true  },
      { "name": "amount",       "type": "uint256", "indexed": false },
      { "name": "metadataUri",  "type": "string",  "indexed": false },
      { "name": "deadline",     "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "SubmissionMade",
    "inputs": [
      { "name": "bountyId",     "type": "uint256", "indexed": true  },
      { "name": "submissionId", "type": "uint256", "indexed": true  },
      { "name": "dev",          "type": "address", "indexed": true  },
      { "name": "skillUri",     "type": "string",  "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "BountyApproved",
    "inputs": [
      { "name": "bountyId",     "type": "uint256", "indexed": true  },
      { "name": "submissionId", "type": "uint256", "indexed": true  },
      { "name": "dev",          "type": "address", "indexed": true  },
      { "name": "devAmount",    "type": "uint256", "indexed": false },
      { "name": "feeAmount",    "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "BountyRefunded",
    "inputs": [
      { "name": "bountyId",     "type": "uint256", "indexed": true  },
      { "name": "manufacturer", "type": "address", "indexed": true  },
      { "name": "amount",       "type": "uint256", "indexed": false }
    ]
  }
] as const;
