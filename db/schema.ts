import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  integer,
  jsonb,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const promptCategoryEnum = pgEnum("prompt_category", [
  "brand",
  "product",
  "comparison",
  "recommendation",
  "problem_solution",
]);

export const llmProviderEnum = pgEnum("llm_provider", [
  "chatgpt",
  "claude",
  "perplexity",
  "gemini",
  "grok",
  "deepseek",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
]);

export const promptRunStatusEnum = pgEnum("prompt_run_status", [
  "pending",
  "running",
  "completed",
]);

// ============================================
// Auth Tables (Better Auth)
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// ============================================
// Core Application Tables
// ============================================

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    image: text("image"), // Organization icon/logo
    companySize: text("company_size"), // "1-10", "11-100", "101-500", "501-1000", "1001+"
    isAgency: boolean("is_agency").default(false),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organization_userId_idx").on(table.userId),
    index("organization_slug_idx").on(table.slug),
  ]
);

export const organizationMember = pgTable(
  "organization_member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organization_member_organizationId_idx").on(table.organizationId),
    index("organization_member_userId_idx").on(table.userId),
    uniqueIndex("organization_member_unique_idx").on(
      table.organizationId,
      table.userId
    ),
  ]
);

export const domain = pgTable(
  "domain",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    name: text("name"), // Friendly name for the domain
    // Keep as workspace_id for backward compatibility (column name in DB)
    // but it references the organization table (renamed from workspace)
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(false).notNull(),
    promptRunStatus:
      promptRunStatusEnum("prompt_run_status").default("pending"),
    promptRunProgress: integer("prompt_run_progress").default(0), // Number of prompts completed
    promptRunTotal: integer("prompt_run_total").default(0), // Total prompts to run
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("domain_workspaceId_idx").on(table.workspaceId),
    index("domain_domain_idx").on(table.domain),
  ]
);

export const topic = pgTable(
  "topic",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    domainId: text("domain_id")
      .notNull()
      .references(() => domain.id, { onDelete: "cascade" }),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("topic_domainId_idx").on(table.domainId),
    index("topic_name_idx").on(table.name),
  ]
);

export const prompt = pgTable(
  "prompt",
  {
    id: text("id").primaryKey(),
    promptText: text("prompt_text").notNull(),
    category: promptCategoryEnum("category").default("brand"),
    domainId: text("domain_id")
      .notNull()
      .references(() => domain.id, { onDelete: "cascade" }),
    topicId: text("topic_id").references(() => topic.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").default(true).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    location: text("location"), // e.g., "Chicago, US" for location-based queries
    selectedProviders: jsonb("selected_providers")
      .$type<string[]>()
      .default(["chatgpt"]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("prompt_domainId_idx").on(table.domainId),
    index("prompt_topicId_idx").on(table.topicId),
    index("prompt_isActive_idx").on(table.isActive),
  ]
);

export const promptRun = pgTable(
  "prompt_run",
  {
    id: text("id").primaryKey(),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompt.id, { onDelete: "cascade" }),
    llmProvider: llmProviderEnum("llm_provider").notNull(),
    responseText: text("response_text"),
    responseMetadata: jsonb("response_metadata"), // tokens used, model version, etc.
    searchQueries: jsonb("search_queries").$type<string[]>(), // queries the model passed to the web search tool
    citations:
      jsonb("citations").$type<
        Array<{ url: string; title: string; snippet?: string }>
      >(), // url_citation annotations from web search
    executedAt: timestamp("executed_at").defaultNow().notNull(),
    durationMs: integer("duration_ms"),
    error: text("error"), // Store error if request failed
  },
  (table) => [
    index("promptRun_promptId_idx").on(table.promptId),
    index("promptRun_executedAt_idx").on(table.executedAt),
    index("promptRun_llmProvider_idx").on(table.llmProvider),
  ]
);

export const mentionAnalysis = pgTable(
  "mention_analysis",
  {
    id: text("id").primaryKey(),
    promptRunId: text("prompt_run_id")
      .notNull()
      .references(() => promptRun.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domain.id, { onDelete: "cascade" }),
    mentioned: boolean("mentioned").default(false).notNull(),
    position: integer("position"), // 1st, 2nd, 3rd mention position
    sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }), // -1.00 to 1.00
    citationUrl: text("citation_url"),
    contextSnippet: text("context_snippet"), // The part of response mentioning the domain
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("mentionAnalysis_promptRunId_idx").on(table.promptRunId),
    index("mentionAnalysis_domainId_idx").on(table.domainId),
    index("mentionAnalysis_mentioned_idx").on(table.mentioned),
  ]
);

export const brandMention = pgTable(
  "brand_mention",
  {
    id: text("id").primaryKey(),
    promptRunId: text("prompt_run_id")
      .notNull()
      .references(() => promptRun.id, { onDelete: "cascade" }),
    brandName: text("brand_name").notNull(),
    brandDomain: text("brand_domain"), // e.g., "calendly.com" for favicon lookup
    mentioned: boolean("mentioned").default(false).notNull(),
    position: integer("position"), // 1st, 2nd, 3rd mention position
    sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }), // -1.00 to 1.00
    citationUrl: text("citation_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("brandMention_promptRunId_idx").on(table.promptRunId),
    index("brandMention_brandName_idx").on(table.brandName),
    index("brandMention_brandDomain_idx").on(table.brandDomain),
  ]
);

// Aggregated daily metrics for fast dashboard queries
export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    id: text("id").primaryKey(),
    domainId: text("domain_id")
      .notNull()
      .references(() => domain.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    llmProvider: llmProviderEnum("llm_provider").notNull(),
    visibilityScore: decimal("visibility_score", { precision: 5, scale: 2 }),
    mentionRate: decimal("mention_rate", { precision: 5, scale: 2 }),
    avgPosition: decimal("avg_position", { precision: 4, scale: 2 }),
    totalPrompts: integer("total_prompts").default(0),
    totalMentions: integer("total_mentions").default(0),
    totalCitations: integer("total_citations").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("dailyMetrics_domainId_idx").on(table.domainId),
    index("dailyMetrics_date_idx").on(table.date),
    index("dailyMetrics_domainId_date_idx").on(table.domainId, table.date),
  ]
);

// ============================================
// Relations
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  organizations: many(organization),
  organizationMemberships: many(organizationMember),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(
  organization,
  ({ one, many }) => ({
    creator: one(user, {
      fields: [organization.userId],
      references: [user.id],
    }),
    members: many(organizationMember),
    domains: many(domain),
  })
);

export const organizationMemberRelations = relations(
  organizationMember,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationMember.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [organizationMember.userId],
      references: [user.id],
    }),
  })
);

export const domainRelations = relations(domain, ({ one, many }) => ({
  organization: one(organization, {
    fields: [domain.workspaceId],
    references: [organization.id],
  }),
  topics: many(topic),
  prompts: many(prompt),
  mentionAnalyses: many(mentionAnalysis),
  dailyMetrics: many(dailyMetrics),
}));

export const topicRelations = relations(topic, ({ one, many }) => ({
  domain: one(domain, {
    fields: [topic.domainId],
    references: [domain.id],
  }),
  prompts: many(prompt),
}));

export const promptRelations = relations(prompt, ({ one, many }) => ({
  domain: one(domain, {
    fields: [prompt.domainId],
    references: [domain.id],
  }),
  topic: one(topic, {
    fields: [prompt.topicId],
    references: [topic.id],
  }),
  runs: many(promptRun),
}));

export const promptRunRelations = relations(promptRun, ({ one, many }) => ({
  prompt: one(prompt, {
    fields: [promptRun.promptId],
    references: [prompt.id],
  }),
  mentionAnalyses: many(mentionAnalysis),
  brandMentions: many(brandMention),
}));

export const mentionAnalysisRelations = relations(
  mentionAnalysis,
  ({ one }) => ({
    promptRun: one(promptRun, {
      fields: [mentionAnalysis.promptRunId],
      references: [promptRun.id],
    }),
    domain: one(domain, {
      fields: [mentionAnalysis.domainId],
      references: [domain.id],
    }),
  })
);

export const brandMentionRelations = relations(brandMention, ({ one }) => ({
  promptRun: one(promptRun, {
    fields: [brandMention.promptRunId],
    references: [promptRun.id],
  }),
}));

export const dailyMetricsRelations = relations(dailyMetrics, ({ one }) => ({
  domain: one(domain, {
    fields: [dailyMetrics.domainId],
    references: [domain.id],
  }),
}));
