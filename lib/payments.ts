import { createPublicClient, createWalletClient, custom, http, parseUnits, type Hash } from 'viem';
import { baseSepolia } from 'viem/chains';
import { pay, getPaymentStatus } from '@base-org/account';
import { getProvider } from './sdk';
import type { Skill } from './types';

const ORIGIN_WALLET = process.env.NEXT_PUBLIC_ORIGIN_WALLET ?? '';
const TESTNET       = process.env.NEXT_PUBLIC_TESTNET === 'true';
const CHAIN         = baseSepolia; // swap for base when going mainnet

// Base Sepolia USDC
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;

const USDC_TRANSFER_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

export type PurchaseState =
  | { status: 'idle' }
  | { status: 'paying' }
  | { status: 'verifying' }
  | { status: 'success'; txId: string }
  | { status: 'error'; message: string };

// ── Direct wallet payment (USDC transfer from connected wallet) ──────────────

export async function purchaseSkillWithWallet(
  skill: Skill,
  address: `0x${string}`,
  onStateChange: (s: PurchaseState) => void,
) {
  if (!ORIGIN_WALLET) {
    onStateChange({ status: 'error', message: 'Origin wallet not configured.' });
    return;
  }

  try {
    onStateChange({ status: 'paying' });

    const wc = createWalletClient({
      account: address,
      chain: CHAIN,
      transport: custom(getProvider()),
    });

    const txHash: Hash = await wc.writeContract({
      address: USDC_ADDRESS,
      abi: USDC_TRANSFER_ABI,
      functionName: 'transfer',
      args: [ORIGIN_WALLET as `0x${string}`, parseUnits(skill.price.toFixed(2), 6)],
    });

    onStateChange({ status: 'verifying' });

    const pc = createPublicClient({ chain: CHAIN, transport: http() });
    await pc.waitForTransactionReceipt({ hash: txHash });

    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash, skillId: skill.id, buyer: address }),
    });

    const data = await res.json() as { success?: boolean; error?: string; redirectUrl?: string };

    if (!res.ok || !data.success) {
      onStateChange({ status: 'error', message: data.error ?? 'Verification failed.' });
      return;
    }

    onStateChange({ status: 'success', txId: txHash });
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment cancelled.';
    onStateChange({ status: 'error', message });
  }
}

// ── Base Pay fallback (no wallet required) ────────────────────────────────────

export async function purchaseSkill(
  skill: Skill,
  onStateChange: (s: PurchaseState) => void,
) {
  if (!ORIGIN_WALLET) {
    onStateChange({ status: 'error', message: 'Origin wallet not configured.' });
    return;
  }

  try {
    onStateChange({ status: 'paying' });

    const result = await pay({
      amount: skill.price.toFixed(2),
      to: ORIGIN_WALLET,
      testnet: TESTNET,
    });

    onStateChange({ status: 'verifying' });

    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: result.id, skillId: skill.id }),
    });

    const data = await res.json() as { success?: boolean; error?: string; redirectUrl?: string };

    if (!res.ok || !data.success) {
      onStateChange({ status: 'error', message: data.error ?? 'Verification failed.' });
      return;
    }

    onStateChange({ status: 'success', txId: result.id });
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment cancelled.';
    onStateChange({ status: 'error', message });
  }
}

export { getPaymentStatus, TESTNET, ORIGIN_WALLET };
