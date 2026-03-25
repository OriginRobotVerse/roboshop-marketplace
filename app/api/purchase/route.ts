import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseUnits, decodeEventLog, type Hash } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getPaymentStatus } from '@base-org/account';
import { db } from '@/lib/db';
import { skills, purchases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const TESTNET       = process.env.NEXT_PUBLIC_TESTNET === 'true';
const ORIGIN_WALLET = (process.env.NEXT_PUBLIC_ORIGIN_WALLET ?? '').toLowerCase();
const USDC_ADDRESS  = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;
const APPSTORE_URL  = process.env.APPSTORE_URL ?? 'https://origin-systems.vercel.app/#apps';

const USDC_TRANSFER_EVENT = [{
  type:   'event',
  name:   'Transfer',
  inputs: [
    { name: 'from',  type: 'address', indexed: true  },
    { name: 'to',    type: 'address', indexed: true  },
    { name: 'value', type: 'uint256', indexed: false },
  ],
}] as const;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    paymentId?: string;
    txHash?:    string;
    buyer?:     string;
    skillId?:   string;
  };
  const { paymentId, txHash, buyer, skillId } = body;

  if (!skillId) {
    return NextResponse.json({ error: 'Missing skillId' }, { status: 400 });
  }

  const [skill] = await db.select().from(skills).where(eq(skills.id, skillId));
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  }

  const skillPrice = parseFloat(skill.price);

  // ── Path A: direct wallet payment (txHash) ───────────────────────────────
  if (txHash) {
    const existing = await db.select().from(purchases).where(eq(purchases.txHash, txHash));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 409 });
    }

    const pc = createPublicClient({ chain: baseSepolia, transport: http() });
    const receipt = await pc.getTransactionReceipt({ hash: txHash as Hash }).catch(() => null);

    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction not found or failed' }, { status: 402 });
    }

    const expectedAmount = parseUnits(skillPrice.toFixed(2), 6);
    const matched = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) return false;
      try {
        const { eventName, args } = decodeEventLog({ abi: USDC_TRANSFER_EVENT, ...log });
        if (eventName !== 'Transfer') return false;
        const { from, to, value } = args as { from: string; to: string; value: bigint };
        const fromOk   = !buyer || from.toLowerCase() === buyer.toLowerCase();
        const toOk     = to.toLowerCase() === ORIGIN_WALLET;
        const amountOk = value >= expectedAmount;
        return fromOk && toOk && amountOk;
      } catch {
        return false;
      }
    });

    if (!matched) {
      return NextResponse.json({ error: 'No matching USDC transfer found in transaction' }, { status: 402 });
    }

    await db.insert(purchases).values({
      skillId,
      buyerAddress: (buyer ?? '').toLowerCase(),
      txHash,
    });

    const redirectUrl = skill.appstoreUrl || APPSTORE_URL;
    return NextResponse.json({ success: true, skillId, txId: txHash, redirectUrl });
  }

  // ── Path B: Base Pay (paymentId) ─────────────────────────────────────────
  if (paymentId) {
    const existing = await db.select().from(purchases).where(eq(purchases.txHash, paymentId));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 409 });
    }

    const { status, amount, recipient } = await getPaymentStatus({ id: paymentId, testnet: TESTNET });

    if (status !== 'completed') {
      return NextResponse.json({ error: `Payment not completed: ${status}` }, { status: 402 });
    }
    if (parseFloat(amount ?? '0') < skillPrice) {
      return NextResponse.json({ error: 'Insufficient payment amount' }, { status: 402 });
    }
    if (recipient?.toLowerCase() !== ORIGIN_WALLET) {
      return NextResponse.json({ error: 'Wrong payment recipient' }, { status: 402 });
    }

    await db.insert(purchases).values({
      skillId,
      buyerAddress: '',
      txHash: paymentId,
    });

    const redirectUrl = skill.appstoreUrl || APPSTORE_URL;
    return NextResponse.json({ success: true, skillId, txId: paymentId, redirectUrl });
  }

  return NextResponse.json({ error: 'Missing paymentId or txHash' }, { status: 400 });
}
