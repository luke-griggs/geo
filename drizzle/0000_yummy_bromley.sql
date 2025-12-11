CREATE TYPE "public"."content_status" AS ENUM('draft', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_template" AS ENUM('smart_suggestion', 'blog_post', 'listicle');--> statement-breakpoint
CREATE TYPE "public"."llm_provider" AS ENUM('chatgpt', 'claude', 'perplexity', 'gemini', 'grok', 'deepseek');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."prompt_category" AS ENUM('brand', 'product', 'comparison', 'recommendation', 'problem_solution');--> statement-breakpoint
CREATE TYPE "public"."prompt_run_status" AS ENUM('pending', 'running', 'completed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_mention" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_run_id" text NOT NULL,
	"brand_name" text NOT NULL,
	"brand_domain" text,
	"mentioned" boolean DEFAULT false NOT NULL,
	"position" integer,
	"sentiment_score" numeric(3, 2),
	"citation_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_project" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"keyword" text NOT NULL,
	"title" text,
	"template" "content_template",
	"status" "content_status" DEFAULT 'draft',
	"serp_results" jsonb,
	"selected_pages" jsonb,
	"generated_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"total_citations" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"name" text,
	"workspace_id" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"prompt_run_status" "prompt_run_status" DEFAULT 'pending',
	"prompt_run_progress" integer DEFAULT 0,
	"prompt_run_total" integer DEFAULT 0,
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
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"image" text,
	"company_size" text,
	"is_agency" boolean DEFAULT false,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_text" text NOT NULL,
	"category" "prompt_category" DEFAULT 'brand',
	"domain_id" text NOT NULL,
	"topic_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"location" text,
	"selected_providers" jsonb DEFAULT '["chatgpt"]'::jsonb,
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
	"search_queries" jsonb,
	"citations" jsonb,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain_id" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_mention" ADD CONSTRAINT "brand_mention_prompt_run_id_prompt_run_id_fk" FOREIGN KEY ("prompt_run_id") REFERENCES "public"."prompt_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_project" ADD CONSTRAINT "content_project_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain" ADD CONSTRAINT "domain_workspace_id_organization_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_analysis" ADD CONSTRAINT "mention_analysis_prompt_run_id_prompt_run_id_fk" FOREIGN KEY ("prompt_run_id") REFERENCES "public"."prompt_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mention_analysis" ADD CONSTRAINT "mention_analysis_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_run" ADD CONSTRAINT "prompt_run_prompt_id_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic" ADD CONSTRAINT "topic_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brandMention_promptRunId_idx" ON "brand_mention" USING btree ("prompt_run_id");--> statement-breakpoint
CREATE INDEX "brandMention_brandName_idx" ON "brand_mention" USING btree ("brand_name");--> statement-breakpoint
CREATE INDEX "brandMention_brandDomain_idx" ON "brand_mention" USING btree ("brand_domain");--> statement-breakpoint
CREATE INDEX "contentProject_domainId_idx" ON "content_project" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "contentProject_status_idx" ON "content_project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dailyMetrics_domainId_idx" ON "daily_metrics" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "dailyMetrics_date_idx" ON "daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "dailyMetrics_domainId_date_idx" ON "daily_metrics" USING btree ("domain_id","date");--> statement-breakpoint
CREATE INDEX "domain_workspaceId_idx" ON "domain" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "domain_domain_idx" ON "domain" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "mentionAnalysis_promptRunId_idx" ON "mention_analysis" USING btree ("prompt_run_id");--> statement-breakpoint
CREATE INDEX "mentionAnalysis_domainId_idx" ON "mention_analysis" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "mentionAnalysis_mentioned_idx" ON "mention_analysis" USING btree ("mentioned");--> statement-breakpoint
CREATE INDEX "organization_userId_idx" ON "organization" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_slug_idx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organization_member_organizationId_idx" ON "organization_member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_member_userId_idx" ON "organization_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_member_unique_idx" ON "organization_member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "prompt_domainId_idx" ON "prompt" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "prompt_topicId_idx" ON "prompt" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "prompt_isActive_idx" ON "prompt" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "promptRun_promptId_idx" ON "prompt_run" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "promptRun_executedAt_idx" ON "prompt_run" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "promptRun_llmProvider_idx" ON "prompt_run" USING btree ("llm_provider");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "topic_domainId_idx" ON "topic" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "topic_name_idx" ON "topic" USING btree ("name");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");