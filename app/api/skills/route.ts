import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { skills } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(skills).orderBy(desc(skills.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/skills', err);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, category, description, longDescription,
      price, devAddress, devUsername, version,
      compatibleDevices, tags, appstoreUrl,
    } = body;

    if (!name || !category || !description || !price || !devAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [skill] = await db.insert(skills).values({
      name,
      category,
      description,
      longDescription: longDescription ?? '',
      price: String(price),
      devAddress: devAddress.toLowerCase(),
      devUsername: devUsername ?? '',
      version: version ?? '1.0.0',
      compatibleDevices: compatibleDevices ?? [],
      tags: tags ?? [],
      appstoreUrl: appstoreUrl ?? '',
    }).returning();

    return NextResponse.json(skill, { status: 201 });
  } catch (err) {
    console.error('POST /api/skills', err);
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 });
  }
}
