import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bountySubmissions, bounties } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rows = await db
      .select()
      .from(bountySubmissions)
      .where(eq(bountySubmissions.bountyId, id))
      .orderBy(desc(bountySubmissions.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/bounties/[id]/submissions', err);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { devAddress, skillUri, notes, onChainSubmissionId, txHash } = body;

    if (!devAddress || !skillUri) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Mark bounty as IN_REVIEW if it's still OPEN
    await db
      .update(bounties)
      .set({ status: 'IN_REVIEW' })
      .where(eq(bounties.id, id));

    const [submission] = await db.insert(bountySubmissions).values({
      bountyId: id,
      devAddress: devAddress.toLowerCase(),
      skillUri,
      notes: notes ?? '',
      onChainSubmissionId: onChainSubmissionId ? String(onChainSubmissionId) : null,
      txHash: txHash ?? null,
    }).returning();

    return NextResponse.json(submission, { status: 201 });
  } catch (err) {
    console.error('POST /api/bounties/[id]/submissions', err);
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
  }
}
