ALTER TABLE "brand_mention" ADD COLUMN "brand_domain" text;--> statement-breakpoint
CREATE INDEX "brandMention_brandDomain_idx" ON "brand_mention" USING btree ("brand_domain");