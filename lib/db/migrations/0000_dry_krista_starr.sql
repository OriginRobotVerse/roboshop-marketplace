CREATE TYPE "public"."bounty_status" AS ENUM('OPEN', 'IN_REVIEW', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('NAVIGATION', 'MANIPULATION', 'PERCEPTION', 'COMMUNICATION', 'SECURITY', 'PLANNING');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "bounties" (
	"id" text PRIMARY KEY NOT NULL,
	"on_chain_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"manufacturer_address" text NOT NULL,
	"manufacturer_name" text DEFAULT '' NOT NULL,
	"status" "bounty_status" DEFAULT 'OPEN' NOT NULL,
	"timeout_days" integer DEFAULT 14 NOT NULL,
	"required_category" "skill_category",
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bounty_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"bounty_id" text NOT NULL,
	"on_chain_submission_id" text,
	"dev_address" text NOT NULL,
	"skill_uri" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" "submission_status" DEFAULT 'PENDING' NOT NULL,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"buyer_address" text NOT NULL,
	"tx_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "skill_category" NOT NULL,
	"description" text NOT NULL,
	"long_description" text DEFAULT '' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"dev_address" text NOT NULL,
	"dev_username" text DEFAULT '' NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"compatible_devices" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"appstore_url" text DEFAULT '' NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bounty_submissions" ADD CONSTRAINT "bounty_submissions_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;