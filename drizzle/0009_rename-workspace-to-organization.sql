-- Migration: Rename workspace to organization and add team membership

-- Step 1: Create role enum for organization members
CREATE TYPE "member_role" AS ENUM('owner', 'admin', 'member');

-- Step 2: Rename workspace table to organization
ALTER TABLE "workspace" RENAME TO "organization";

-- Step 3: Rename indexes on organization table
ALTER INDEX "workspace_userId_idx" RENAME TO "organization_userId_idx";
ALTER INDEX "workspace_slug_idx" RENAME TO "organization_slug_idx";

-- Step 4: Add image column to organization table
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "image" text;

-- NOTE: We keep workspace_id column in domain table for backward compatibility
-- The foreign key reference will automatically point to the renamed "organization" table

-- Step 5: Create organization_member table for team membership
CREATE TABLE IF NOT EXISTS "organization_member" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" "member_role" NOT NULL DEFAULT 'member',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Step 6: Create indexes for organization_member table
CREATE INDEX IF NOT EXISTS "organization_member_organizationId_idx" ON "organization_member" ("organization_id");
CREATE INDEX IF NOT EXISTS "organization_member_userId_idx" ON "organization_member" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_member_unique_idx" ON "organization_member" ("organization_id", "user_id");

-- Step 7: Migrate existing workspace owners to organization_member table
-- This creates an owner membership for each existing organization
INSERT INTO "organization_member" ("id", "organization_id", "user_id", "role", "created_at", "updated_at")
SELECT 
  gen_random_uuid()::text,
  o."id",
  o."user_id",
  'owner'::"member_role",
  o."created_at",
  NOW()
FROM "organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "organization_member" om 
  WHERE om."organization_id" = o."id" AND om."user_id" = o."user_id"
);

