export type SkillCategory =
  | "NAVIGATION"
  | "MANIPULATION"
  | "PERCEPTION"
  | "COMMUNICATION"
  | "SECURITY"
  | "PLANNING";

export type BountyStatus = "OPEN" | "IN_REVIEW" | "COMPLETED";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  longDescription: string;
  price: number;
  dev: string;
  rating: number;
  reviews: number;
  downloads: number;
  version: string;
  compatibleDevices: string[];
  tags: string[];
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  amount: number;
  manufacturer: string;
  manufacturerLogo?: string;
  status: BountyStatus;
  daysLeft: number | null;
  submissions: number;
  requiredCategory: SkillCategory;
  postedAt: string;
}
