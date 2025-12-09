-- Add company size and agency info to organization table
ALTER TABLE "organization" ADD COLUMN "company_size" text;
ALTER TABLE "organization" ADD COLUMN "is_agency" boolean DEFAULT false;
