import { db } from '@/lib/db';
import { skills, bounties } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import MarketplaceClient from '@/components/marketplace-client';
import type { Skill } from '@/lib/types';

export const revalidate = 0;

export default async function MarketplacePage() {
  const [skillRows, bountyRows] = await Promise.all([
    db.select().from(skills).orderBy(skills.createdAt),
    db.select().from(bounties).where(eq(bounties.status, 'OPEN')),
  ]);

  const skillList: Skill[] = skillRows.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    longDescription: s.longDescription,
    price: parseFloat(s.price),
    dev: s.devUsername || s.devAddress.slice(0, 8),
    devAddress: s.devAddress,
    rating: parseFloat(s.rating ?? '0'),
    reviews: s.reviews,
    downloads: s.downloads,
    version: s.version,
    compatibleDevices: s.compatibleDevices,
    tags: s.tags,
    appstoreUrl: s.appstoreUrl,
  }));

  const stats = {
    totalSkills: skillList.length,
    openBounties: bountyRows.length,
  };

  return <MarketplaceClient skills={skillList} stats={stats} />;
}
