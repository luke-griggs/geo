CREATE TYPE "public"."llm_provider" AS ENUM('chatgpt', 'claude', 'perplexity', 'gemini', 'grok', 'deepseek');--> statement-breakpoint
CREATE TYPE "public"."prompt_category" AS ENUM('brand', 'product', 'comparison', 'recommendation', 'problem_solution');--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"llm_provider" "llm_provider" NOT NULL,
	"visibility_score" numeric(5, 2),
	"mention_rate" numeric(5, 2),
	"avg_position" numeric(4, 2),
	"total_prompts" integer DEFAULT 0,
	"total_mentions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"name" text,
	"workspace_id" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mention_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_run_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"mentioned" boolean DEFAULT false NOT NULL,
	"position" integer,
	"sentiment_score" numeric(3, 2),
	"citation_url" text,
	"context_snippet" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_text" text NOT NULL,
	"category" "prompt_category" DEFAULT 'brand',
	"domain_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_run" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_id" text NOT NULL,
	"llm_provider" "llm_provider" NOT NULL,
	"response_text" text,
	"response_metadata" jsonb,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_analysis" ADD CONSTRAINT "mention_analysis_prompt_run_id_prompt_run_id_fk" FOREIGN KEY ("prompt_run_id") REFERENCES "public"."prompt_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_analysis" ADD CONSTRAINT "mention_analysis_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_run" ADD CONSTRAINT "prompt_run_prompt_id_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dailyMetrics_domainId_idx" ON "daily_metrics" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "dailyMetrics_date_idx" ON "daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "dailyMetrics_domainId_date_idx" ON "daily_metrics" USING btree ("domain_id","date");--> statement-breakpoint
CREATE INDEX "domain_workspaceId_idx" ON "domain" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "domain_domain_idx" ON "domain" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "mentionAnalysis_promptRunId_idx" ON "mention_analysis" USING btree ("prompt_run_id");--> statement-breakpoint
CREATE INDEX "mentionAnalysis_domainId_idx" ON "mention_analysis" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "mentionAnalysis_mentioned_idx" ON "mention_analysis" USING btree ("mentioned");--> statement-breakpoint
CREATE INDEX "prompt_domainId_idx" ON "prompt" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "prompt_isActive_idx" ON "prompt" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "promptRun_promptId_idx" ON "prompt_run" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "promptRun_executedAt_idx" ON "prompt_run" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "promptRun_llmProvider_idx" ON "prompt_run" USING btree ("llm_provider");--> statement-breakpoint
CREATE INDEX "workspace_userId_idx" ON "workspace" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_slug_idx" ON "workspace" USING btree ("slug");