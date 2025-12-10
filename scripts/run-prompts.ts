/**
 * Manual script to run prompts
 *
 * Usage:
 *   bun run scripts/run-prompts.ts                    # Run all prompts
 *   bun run scripts/run-prompts.ts --domain <id>     # Run prompts for a specific domain
 *   bun run scripts/run-prompts.ts --workspace <id>  # Run prompts for all domains in a workspace
 *
 * Make sure to have your .env file configured with:
 *   - DATABASE_URL
 *   - OPENAI_API_KEY
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";

// Initialize database
const db = drizzle(process.env.DATABASE_URL!, { schema });

// Import the runner logic (we'll inline it here to avoid module resolution issues)
import { runPromptAgainstLLM, isLLMError, type LLMProvider } from "../lib/llm";

interface RunResult {
  promptId: string;
  promptRunId: string;
  provider: LLMProvider;
  success: boolean;
  error?: string;
  mentioned?: boolean;
  responsePreview?: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

// runOpenAI imported from ../lib/llm

function analyzeResponseForMentions(
  responseText: string,
  domainUrl: string,
  brandName?: string | null
): {
  mentioned: boolean;
  position: number | null;
  contextSnippet: string | null;
} {
  const lowerResponse = responseText.toLowerCase();
  const lowerDomain = domainUrl.toLowerCase();

  // Build list of variants to check
  const domainVariants: string[] = [
    lowerDomain,
    `www.${lowerDomain}`,
    lowerDomain.replace("www.", ""),
  ];

  // Also check for the brand name (e.g., "Fairlife" instead of just "fairlife.com")
  if (brandName) {
    const lowerBrandName = brandName.toLowerCase();
    if (!domainVariants.includes(lowerBrandName)) {
      domainVariants.push(lowerBrandName);
    }
  }

  // Also try the domain without TLD (e.g., "fairlife" from "fairlife.com")
  const domainWithoutTld = lowerDomain.split(".")[0];
  if (
    domainWithoutTld &&
    domainWithoutTld.length > 2 &&
    !domainVariants.includes(domainWithoutTld)
  ) {
    domainVariants.push(domainWithoutTld);
  }

  let mentioned = false;
  let position: number | null = null;
  let contextSnippet: string | null = null;

  for (const variant of domainVariants) {
    const index = lowerResponse.indexOf(variant);
    if (index !== -1) {
      mentioned = true;
      const textBefore = responseText.slice(0, index);
      const linesBefore = textBefore
        .split(/[.\n]/)
        .filter((s) => s.trim().length > 0);
      position = linesBefore.length + 1;
      const start = Math.max(0, index - 100);
      const end = Math.min(responseText.length, index + variant.length + 100);
      contextSnippet = responseText.slice(start, end);
      break;
    }
  }

  return { mentioned, position, contextSnippet };
}

async function runPromptsForDomain(domainId: string): Promise<RunResult[]> {
  const results: RunResult[] = [];

  const domainRecord = await db.query.domain.findFirst({
    where: eq(schema.domain.id, domainId),
  });

  if (!domainRecord) {
    throw new Error(`Domain not found: ${domainId}`);
  }

  const activePrompts = await db.query.prompt.findMany({
    where: and(
      eq(schema.prompt.domainId, domainId),
      eq(schema.prompt.isActive, true)
    ),
  });

  console.log(
    `\n📋 Running ${activePrompts.length} prompts for domain: ${domainRecord.domain}`
  );

  for (let i = 0; i < activePrompts.length; i++) {
    const p = activePrompts[i];
    const providers: LLMProvider[] = (p.selectedProviders as LLMProvider[]) || [
      "chatgpt",
    ];

    console.log(
      `\n  [${i + 1}/${activePrompts.length}] "${p.promptText.slice(0, 50)}..."`
    );
    console.log(`    Running on: ${providers.join(", ")}`);

    // Run for all providers in parallel
    const runPromises = providers.map(async (provider) => {
      const promptRunId = generateId();
      try {
        const response = await runPromptAgainstLLM(p.promptText, provider);

        if (isLLMError(response)) {
          await db.insert(schema.promptRun).values({
            id: promptRunId,
            promptId: p.id,
            llmProvider: provider,
            error: response.error,
            executedAt: new Date(),
          });

          console.log(`    [${provider}] ❌ Error: ${response.error}`);
          return {
            promptId: p.id,
            promptRunId,
            provider,
            success: false,
            error: response.error,
          };
        }

        await db.insert(schema.promptRun).values({
          id: promptRunId,
          promptId: p.id,
          llmProvider: provider,
          responseText: response.text,
          responseMetadata: response.metadata,
          durationMs: response.durationMs,
          executedAt: new Date(),
        });

        const analysis = analyzeResponseForMentions(
          response.text,
          domainRecord.domain,
          domainRecord.name
        );

        await db.insert(schema.mentionAnalysis).values({
          id: generateId(),
          promptRunId,
          domainId: domainId,
          mentioned: analysis.mentioned,
          position: analysis.position,
          contextSnippet: analysis.contextSnippet,
        });

        const mentionStatus = analysis.mentioned
          ? "✅ Mentioned"
          : "⬜ Not mentioned";
        console.log(
          `    [${provider}] ${mentionStatus} (${response.durationMs}ms)`
        );

        return {
          promptId: p.id,
          promptRunId,
          provider,
          success: true,
          mentioned: analysis.mentioned,
          responsePreview: response.text.slice(0, 200),
        };
      } catch (error) {
        console.log(
          `    [${provider}] ❌ Error: ${
            error instanceof Error ? error.message : "Unknown"
          }`
        );
        return {
          promptId: p.id,
          promptRunId,
          provider,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const promptResults = await Promise.all(runPromises);
    results.push(...promptResults);

    // Rate limiting delay between prompts
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

async function runAllPrompts() {
  const domainsWithPrompts = await db.query.domain.findMany({
    with: {
      prompts: {
        where: eq(schema.prompt.isActive, true),
      },
    },
  });

  const activeDomains = domainsWithPrompts.filter((d) => d.prompts.length > 0);

  console.log(`\n🚀 Running prompts for ${activeDomains.length} domains\n`);

  let totalPrompts = 0;
  let successfulRuns = 0;
  let mentions = 0;

  for (const d of activeDomains) {
    const results = await runPromptsForDomain(d.id);
    totalPrompts += results.length;
    successfulRuns += results.filter((r) => r.success).length;
    mentions += results.filter((r) => r.mentioned).length;

    // Delay between domains
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Domains processed: ${activeDomains.length}`);
  console.log(`   Total prompts: ${totalPrompts}`);
  console.log(`   Successful runs: ${successfulRuns}`);
  console.log(`   Failed runs: ${totalPrompts - successfulRuns}`);
  console.log(`   Mentions found: ${mentions}`);
  console.log("=".repeat(50) + "\n");
}

async function main() {
  const args = process.argv.slice(2);

  console.log("🔍 GEO Prompt Runner");
  console.log("=".repeat(50));

  // Check for required env vars
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is not set");
    process.exit(1);
  }

  const domainIndex = args.indexOf("--domain");
  const workspaceIndex = args.indexOf("--workspace");

  if (domainIndex !== -1 && args[domainIndex + 1]) {
    // Run for specific domain
    const domainId = args[domainIndex + 1];
    console.log(`Running for domain: ${domainId}`);
    await runPromptsForDomain(domainId);
  } else if (workspaceIndex !== -1 && args[workspaceIndex + 1]) {
    // Run for all domains in a workspace
    const workspaceId = args[workspaceIndex + 1];
    console.log(`Running for workspace: ${workspaceId}`);

    const domains = await db.query.domain.findMany({
      where: eq(schema.domain.workspaceId, workspaceId),
    });

    for (const d of domains) {
      await runPromptsForDomain(d.id);
    }
  } else {
    // Run all
    await runAllPrompts();
  }

  console.log("✅ Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
