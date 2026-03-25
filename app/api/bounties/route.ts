import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bounties } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(bounties).orderBy(desc(bounties.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/bounties', err);
    return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, description, amount, manufacturerAddress,
      manufacturerName, timeoutDays, requiredCategory,
      onChainId, txHash,
    } = body;

    if (!title || !description || !amount || !manufacturerAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [bounty] = await db.insert(bounties).values({
      title,
      description,
      amount: String(amount),
      manufacturerAddress: manufacturerAddress.toLowerCase(),
      manufacturerName: manufacturerName ?? '',
      timeoutDays: timeoutDays ?? 14,
      requiredCategory: requiredCategory ?? null,
      onChainId: onChainId ? String(onChainId) : null,
      txHash: txHash ?? null,
    }).returning();

    return NextResponse.json(bounty, { status: 201 });
  } catch (err) {
    console.error('POST /api/bounties', err);
    return NextResponse.json({ error: 'Failed to create bounty' }, { status: 500 });
  }
}
