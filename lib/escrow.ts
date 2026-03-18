import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
  type Hash,
} from 'viem';
import { sendCalls, waitForCallsStatus } from 'viem/actions';
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
  | { status: 'success'; txHash: Hash }
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

    // Check USDC balance before attempting
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

    // Batch USDC approve + postBounty into one popup (EIP-5792).
    // forceAtomic ensures approve is rolled back if postBounty fails.
    onState({ status: 'posting' });
    const { id } = await sendCalls(wc, {
      forceAtomic: true,
      calls: [
        {
          to:           USDC_ADDRESS,
          abi:          USDC_ABI,
          functionName: 'approve',
          args:         [ESCROW_ADDRESS, amount],
        },
        {
          to:           ESCROW_ADDRESS,
          abi:          ESCROW_ABI,
          functionName: 'postBounty',
          args:         [amount, metadataUri, timeout],
        },
      ],
    });

    const { receipts, status } = await waitForCallsStatus(wc, { id, throwOnFailure: true });
    if (status === 'failure' || !receipts?.length) {
      throw new Error('Batch transaction failed');
    }

    const txHash = receipts[receipts.length - 1].transactionHash as Hash;
    onState({ status: 'success', txHash });
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
    await pc.waitForTransactionReceipt({ hash: tx });

    onState({ status: 'success', txHash: tx });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transaction failed.';
    onState({ status: 'error', message });
  }
}
