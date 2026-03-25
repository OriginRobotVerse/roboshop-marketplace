import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
  decodeEventLog,
  type Hash,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import { ESCROW_ABI, ESCROW_ADDRESS } from './escrow-abi';
import { getProvider } from './sdk';

const TESTNET = process.env.NEXT_PUBLIC_TESTNET === 'true';
const CHAIN   = TESTNET ? baseSepolia : baseSepolia; // swap for base when going mainnet

// Base Sepolia USDC
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;

const USDC_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

function publicClient() {
  return createPublicClient({ chain: CHAIN, transport: http() });
}

function walletClient(address: `0x${string}`) {
  return createWalletClient({
    account: address,
    chain: CHAIN,
    transport: custom(getProvider()),
  });
}

export type BountyTxState =
  | { status: 'idle' }
  | { status: 'approving' }
  | { status: 'posting' }
  | { status: 'submitting' }
  | { status: 'approving-submission' }
  | { status: 'success'; txHash: Hash; onChainId?: string }
  | { status: 'error'; message: string };

export async function postBounty(
  {
    address,
    amountUsdc,
    metadataUri,
    timeoutDays,
  }: {
    address:     `0x${string}`;
    amountUsdc:  number;
    metadataUri: string;
    timeoutDays: number;
  },
  onState: (s: BountyTxState) => void,
) {
  try {
    const pc     = publicClient();
    const wc     = walletClient(address);
    const amount = parseUnits(amountUsdc.toString(), 6);
    const timeout = BigInt(timeoutDays * 24 * 60 * 60);

    const balance = await pc.readContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    if (balance < amount) {
      const have = formatUnits(balance, 6);
      onState({ status: 'error', message: `Insufficient USDC balance. You have ${have} USDC but need ${amountUsdc}.` });
      return;
    }

    onState({ status: 'approving' });
    const approveTx = await wc.writeContract({
      address:      USDC_ADDRESS,
      abi:          USDC_ABI,
      functionName: 'approve',
      args:         [ESCROW_ADDRESS, amount],
    });
    await pc.waitForTransactionReceipt({ hash: approveTx });

    onState({ status: 'posting' });
    const bountyTx = await wc.writeContract({
      address:      ESCROW_ADDRESS,
      abi:          ESCROW_ABI,
      functionName: 'postBounty',
      args:         [amount, timeout, metadataUri],
    });
    const receipt = await pc.waitForTransactionReceipt({ hash: bountyTx });

    // Extract bountyId from BountyPosted event
    let onChainId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: ESCROW_ABI, ...log });
        if (decoded.eventName === 'BountyPosted') {
          onChainId = String((decoded.args as { bountyId: bigint }).bountyId);
          break;
        }
      } catch { /* not this event */ }
    }

    onState({ status: 'success', txHash: bountyTx, onChainId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transaction failed.';
    onState({ status: 'error', message });
  }
}

export async function submitSkill(
  {
    address,
    bountyId,
    skillUri,
  }: {
    address:  `0x${string}`;
    bountyId: bigint;
    skillUri: string;
  },
  onState: (s: BountyTxState) => void,
) {
  try {
    const wc = walletClient(address);
    const pc = publicClient();

    onState({ status: 'submitting' });
    const tx = await wc.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'submit',
      args: [bountyId, skillUri],
    });
    const receipt = await pc.waitForTransactionReceipt({ hash: tx });

    // Extract submissionId from SubmissionMade event
    let onChainId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: ESCROW_ABI, ...log });
        if (decoded.eventName === 'SubmissionMade') {
          onChainId = String((decoded.args as { submissionId: bigint }).submissionId);
          break;
        }
      } catch { /* not this event */ }
    }

    onState({ status: 'success', txHash: tx, onChainId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transaction failed.';
    onState({ status: 'error', message });
  }
}

export async function approveBounty(
  {
    address,
    onChainBountyId,
    onChainSubmissionId,
  }: {
    address:             `0x${string}`;
    onChainBountyId:     bigint;
    onChainSubmissionId: bigint;
  },
  onState: (s: BountyTxState) => void,
) {
  try {
    const wc = walletClient(address);
    const pc = publicClient();

    onState({ status: 'approving-submission' });
    const tx = await wc.writeContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'approve',
      args: [onChainBountyId, onChainSubmissionId],
    });
    await pc.waitForTransactionReceipt({ hash: tx });

    onState({ status: 'success', txHash: tx });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transaction failed.';
    onState({ status: 'error', message });
  }
}
