-- Add topics table
CREATE TABLE IF NOT EXISTS "topic" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain_id" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add topic_id to prompt table
ALTER TABLE "prompt" ADD COLUMN "topic_id" text;

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "topic" ADD CONSTRAINT "topic_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "prompt" ADD CONSTRAINT "prompt_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "topic_domainId_idx" ON "topic" USING btree ("domain_id");
CREATE INDEX IF NOT EXISTS "topic_name_idx" ON "topic" USING btree ("name");
CREATE INDEX IF NOT EXISTS "prompt_topicId_idx" ON "prompt" USING btree ("topic_id");
