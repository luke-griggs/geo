CREATE TABLE "brand_mention" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_run_id" text NOT NULL,
	"brand_name" text NOT NULL,
	"mentioned" boolean DEFAULT false NOT NULL,
	"position" integer,
	"sentiment_score" numeric(3, 2),
	"citation_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_mention" ADD CONSTRAINT "brand_mention_prompt_run_id_prompt_run_id_fk" FOREIGN KEY ("prompt_run_id") REFERENCES "public"."prompt_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brandMention_promptRunId_idx" ON "brand_mention" USING btree ("prompt_run_id");--> statement-breakpoint
CREATE INDEX "brandMention_brandName_idx" ON "brand_mention" USING btree ("brand_name");