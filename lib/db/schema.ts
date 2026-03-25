import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const skillCategoryEnum = pgEnum('skill_category', [
  'NAVIGATION',
  'MANIPULATION',
  'PERCEPTION',
  'COMMUNICATION',
  'SECURITY',
  'PLANNING',
]);

export const bountyStatusEnum = pgEnum('bounty_status', [
  'OPEN',
  'IN_REVIEW',
  'COMPLETED',
]);

export const submissionStatusEnum = pgEnum('submission_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const skills = pgTable('skills', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  category: skillCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  longDescription: text('long_description').notNull().default(''),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  devAddress: text('dev_address').notNull(),
  devUsername: text('dev_username').notNull().default(''),
  version: text('version').notNull().default('1.0.0'),
  compatibleDevices: text('compatible_devices').array().notNull().default([]),
  tags: text('tags').array().notNull().default([]),
  appstoreUrl: text('appstore_url').notNull().default(''),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('0'),
  reviews: integer('reviews').notNull().default(0),
  downloads: integer('downloads').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const bounties = pgTable('bounties', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  onChainId: text('on_chain_id'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  manufacturerAddress: text('manufacturer_address').notNull(),
  manufacturerName: text('manufacturer_name').notNull().default(''),
  status: bountyStatusEnum('status').notNull().default('OPEN'),
  timeoutDays: integer('timeout_days').notNull().default(14),
  requiredCategory: skillCategoryEnum('required_category'),
  txHash: text('tx_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const bountySubmissions = pgTable('bounty_submissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  bountyId: text('bounty_id').notNull().references(() => bounties.id),
  onChainSubmissionId: text('on_chain_submission_id'),
  devAddress: text('dev_address').notNull(),
  skillUri: text('skill_uri').notNull(),
  notes: text('notes').notNull().default(''),
  status: submissionStatusEnum('status').notNull().default('PENDING'),
  txHash: text('tx_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  skillId: text('skill_id').notNull().references(() => skills.id),
  buyerAddress: text('buyer_address').notNull(),
  txHash: text('tx_hash').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
