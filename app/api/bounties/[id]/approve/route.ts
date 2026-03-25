import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bounties, bountySubmissions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    await db
      .update(bountySubmissions)
      .set({ status: 'APPROVED' })
      .where(eq(bountySubmissions.id, submissionId));

    await db
      .update(bounties)
      .set({ status: 'COMPLETED' })
      .where(eq(bounties.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/bounties/[id]/approve', err);
    return NextResponse.json({ error: 'Failed to approve submission' }, { status: 500 });
  }
}
