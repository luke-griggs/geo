import db from "@/db";
import {
  prompt,
  promptRun,
  mentionAnalysis,
  domain,
  brandMention,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "./id";
import {
  runPromptAgainstLLM,
  isLLMError,
  extractBrandsWithGroq,
  isBrandExtractionError,
  enrichCitationsWithDescriptions,
  type LLMProvider,
} from "./llm";

export interface RunResult {
  promptId: string;
  promptRunId: string;
  provider: LLMProvider;
  success: boolean;
  error?: string;
  mentioned?: boolean;
  responsePreview?: string;
}

/**
 * Analyze a response for mentions of a domain
 * This is a simple implementation - can be enhanced with NLP later
 */
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
  // Remove www. prefix for consistent matching
  const lowerDomain = domainUrl.toLowerCase().replace(/^www\./, "");

  // Build list of variants to check
  const domainVariants: string[] = [lowerDomain, `www.${lowerDomain}`];

  // Also check for the brand name (e.g., "Fairlife" instead of just "fairlife.com")
  if (brandName) {
    const lowerBrandName = brandName.toLowerCase();
    // Add the brand name if it's different from the domain
    if (!domainVariants.includes(lowerBrandName)) {
      domainVariants.push(lowerBrandName);
    }
  }

  // Also try the domain without TLD (e.g., "fairlife" from "fairlife.com")
  // This extracts the main brand name from domains like "fairlife.com" or "shop.fairlife.com"
  const domainParts = lowerDomain.split(".");
  // Get the main domain name (second-to-last part for subdomains, or first part for simple domains)
  const domainWithoutTld =
    domainParts.length > 2
      ? domainParts[domainParts.length - 2] // e.g., "shop.fairlife.com" -> "fairlife"
      : domainParts[0]; // e.g., "fairlife.com" -> "fairlife"

  if (
    domainWithoutTld &&
    domainWithoutTld.length > 2 &&
    !domainVariants.includes(domainWithoutTld)
  ) {
    domainVariants.push(domainWithoutTld);
  }

  // Debug logging
  console.log(
    `[analyzeResponseForMentions] Domain: ${domainUrl}, Brand: ${
      brandName || "NULL"
    }, Variants: ${domainVariants.join(", ")}`
  );
  console.log(
    `[analyzeResponseForMentions] Response preview: ${responseText.slice(
      0,
      200
    )}...`
  );

  let mentioned = false;
  let position: number | null = null;
  let contextSnippet: string | null = null;

  for (const variant of domainVariants) {
    const index = lowerResponse.indexOf(variant);
    if (index !== -1) {
      mentioned = true;
      console.log(
        `[analyzeResponseForMentions] ✓ Found match for variant: "${variant}" at index ${index}`
      );

      // Calculate rough position (1st, 2nd, etc. in the list)
      // This counts how many sentences/lines come before this mention
      const textBefore = responseText.slice(0, index);
      const linesBefore = textBefore
        .split(/[.\n]/)
        .filter((s) => s.trim().length > 0);
      position = linesBefore.length + 1;

      // Extract context snippet (100 chars before and after)
      const start = Math.max(0, index - 100);
      const end = Math.min(responseText.length, index + variant.length + 100);
      contextSnippet = responseText.slice(start, end);

      break;
    }
  }

  if (!mentioned) {
    console.log(
      `[analyzeResponseForMentions] ✗ No match found for any variant`
    );
  }

  return { mentioned, position, contextSnippet };
}

/**
 * Extract and store brand mentions from a prompt response using Groq
 */
async function storeBrandMentions(
  responseText: string,
  promptRunId: string
): Promise<void> {
  const result = await extractBrandsWithGroq(responseText);

  if (isBrandExtractionError(result)) {
    console.error("Failed to extract brands with Groq:", result.error);
    return;
  }

  for (const brand of result.brands) {
    await db.insert(brandMention).values({
      id: generateId(),
      promptRunId,
      brandName: brand.name,
      brandDomain: brand.domain,
      mentioned: true,
      position: brand.position,
      citationUrl: brand.citationUrl,
    });
  }
}

/**
 * Run all active prompts for a specific domain
 */
export async function runPromptsForDomain(
  domainId: string,
  provider: LLMProvider = "chatgpt"
): Promise<RunResult[]> {
  const results: RunResult[] = [];

  // Get the domain
  const domainRecord = await db.query.domain.findFirst({
    where: eq(domain.id, domainId),
  });

  if (!domainRecord) {
    throw new Error(`Domain not found: ${domainId}`);
  }

  // Get all active prompts for this domain
  const activePrompts = await db.query.prompt.findMany({
    where: and(eq(prompt.domainId, domainId), eq(prompt.isActive, true)),
  });

  console.log(
    `Running ${activePrompts.length} prompts for domain ${domainRecord.domain}`
  );

  for (const p of activePrompts) {
    const promptRunId = generateId();

    try {
      const response = await runPromptAgainstLLM(p.promptText, provider);

      if (isLLMError(response)) {
        // Store the failed run
        await db.insert(promptRun).values({
          id: promptRunId,
          promptId: p.id,
          llmProvider: provider,
          error: response.error,
          executedAt: new Date(),
        });

        results.push({
          promptId: p.id,
          promptRunId,
          provider,
          success: false,
          error: response.error,
        });
        continue;
      }

      // Enrich citations with meta descriptions (fetched from URLs)
      const enrichedCitations = response.citations
        ? await enrichCitationsWithDescriptions(response.citations)
        : undefined;

      // Store the successful run
      await db.insert(promptRun).values({
        id: promptRunId,
        promptId: p.id,
        llmProvider: provider,
        responseText: response.text,
        responseMetadata: response.metadata,
        searchQueries: response.searchQueries,
        citations: enrichedCitations,
        durationMs: response.durationMs,
        executedAt: new Date(),
      });

      // Analyze for mentions
      const analysis = analyzeResponseForMentions(
        response.text,
        domainRecord.domain,
        domainRecord.name
      );

      // Store mention analysis
      await db.insert(mentionAnalysis).values({
        id: generateId(),
        promptRunId,
        domainId: domainId,
        mentioned: analysis.mentioned,
        position: analysis.position,
        contextSnippet: analysis.contextSnippet,
      });

      // Extract and store brand mentions from the response
      await storeBrandMentions(response.text, promptRunId);

      results.push({
        promptId: p.id,
        promptRunId,
        provider,
        success: true,
        mentioned: analysis.mentioned,
        responsePreview: response.text.slice(0, 200),
      });
    } catch (error) {
      console.error(`Error running prompt ${p.id}:`, error);

      results.push({
        promptId: p.id,
        promptRunId,
        provider,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Add a small delay between prompts to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Run a single prompt and analyze for mentions
 */
export async function runSinglePrompt(
  promptId: string,
  provider: LLMProvider = "chatgpt"
): Promise<RunResult> {
  // Get the prompt with its domain
  const promptRecord = await db.query.prompt.findFirst({
    where: eq(prompt.id, promptId),
    with: {
      domain: true,
    },
  });

  if (!promptRecord) {
    throw new Error(`Prompt not found: ${promptId}`);
  }

  if (!promptRecord.domain) {
    throw new Error(`Domain not found for prompt: ${promptId}`);
  }

  const promptRunId = generateId();

  try {
    const response = await runPromptAgainstLLM(
      promptRecord.promptText,
      provider
    );

    if (isLLMError(response)) {
      // Store the failed run
      await db.insert(promptRun).values({
        id: promptRunId,
        promptId: promptRecord.id,
        llmProvider: provider,
        error: response.error,
        executedAt: new Date(),
      });

      return {
        promptId: promptRecord.id,
        promptRunId,
        provider,
        success: false,
        error: response.error,
      };
    }

    // Enrich citations with meta descriptions (fetched from URLs)
    const enrichedCitations = response.citations
      ? await enrichCitationsWithDescriptions(response.citations)
      : undefined;

    // Store the successful run
    await db.insert(promptRun).values({
      id: promptRunId,
      promptId: promptRecord.id,
      llmProvider: provider,
      responseText: response.text,
      responseMetadata: response.metadata,
      searchQueries: response.searchQueries,
      citations: enrichedCitations,
      durationMs: response.durationMs,
      executedAt: new Date(),
    });

    // Analyze for mentions
    const analysis = analyzeResponseForMentions(
      response.text,
      promptRecord.domain.domain,
      promptRecord.domain.name
    );

    // Store mention analysis
    await db.insert(mentionAnalysis).values({
      id: generateId(),
      promptRunId,
      domainId: promptRecord.domain.id,
      mentioned: analysis.mentioned,
      position: analysis.position,
      contextSnippet: analysis.contextSnippet,
    });

    // Extract and store brand mentions from the response
    await storeBrandMentions(response.text, promptRunId);

    return {
      promptId: promptRecord.id,
      promptRunId,
      provider,
      success: true,
      mentioned: analysis.mentioned,
      responsePreview: response.text.slice(0, 200),
    };
  } catch (error) {
    console.error(`Error running prompt ${promptId}:`, error);

    return {
      promptId: promptRecord.id,
      promptRunId,
      provider,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run all active prompts for all domains across all workspaces
 * This is what the cron job calls
 */
export async function runAllPrompts(
  provider: LLMProvider = "chatgpt"
): Promise<{ domainId: string; domainName: string; results: RunResult[] }[]> {
  const allResults: {
    domainId: string;
    domainName: string;
    results: RunResult[];
  }[] = [];

  // Get all domains that have active prompts
  const domainsWithPrompts = await db.query.domain.findMany({
    with: {
      prompts: {
        where: eq(prompt.isActive, true),
      },
    },
  });

  // Filter to only domains that have at least one active prompt
  const activeDomains = domainsWithPrompts.filter((d) => d.prompts.length > 0);

  console.log(`Running prompts for ${activeDomains.length} domains`);

  for (const d of activeDomains) {
    try {
      const results = await runPromptsForDomain(d.id, provider);
      allResults.push({
        domainId: d.id,
        domainName: d.domain,
        results,
      });
    } catch (error) {
      console.error(`Error running prompts for domain ${d.id}:`, error);
    }

    // Add delay between domains
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return allResults;
}

/**
 * Run a single prompt and return result (used by parallel runner)
 * This is a helper that doesn't throw - it returns the result with success/error status
 *
 * OPTIMIZED: Citation enrichment and brand extraction are deferred to not block progress
 */
async function runSinglePromptSafe(
  p: { id: string; promptText: string },
  domainUrl: string,
  domainId: string,
  brandName: string | null,
  provider: LLMProvider = "chatgpt"
): Promise<RunResult> {
  const promptRunId = generateId();

  try {
    const response = await runPromptAgainstLLM(p.promptText, provider);

    if (isLLMError(response)) {
      // Store the failed run
      await db.insert(promptRun).values({
        id: promptRunId,
        promptId: p.id,
        llmProvider: provider,
        error: response.error,
        executedAt: new Date(),
      });

      return {
        promptId: p.id,
        promptRunId,
        provider,
        success: false,
        error: response.error,
      };
    }

    // Store citations WITHOUT enrichment - we'll fetch descriptions lazily when viewing
    // This removes a major bottleneck (5+ HTTP requests per prompt)
    const citations = response.citations;

    // Store the successful run immediately (don't wait for enrichment)
    await db.insert(promptRun).values({
      id: promptRunId,
      promptId: p.id,
      llmProvider: provider,
      responseText: response.text,
      responseMetadata: response.metadata,
      searchQueries: response.searchQueries,
      citations: citations,
      durationMs: response.durationMs,
      executedAt: new Date(),
    });

    // Analyze for mentions (this is fast, keep it synchronous)
    const analysis = analyzeResponseForMentions(
      response.text,
      domainUrl,
      brandName
    );

    // Store mention analysis
    await db.insert(mentionAnalysis).values({
      id: generateId(),
      promptRunId,
      domainId: domainId,
      mentioned: analysis.mentioned,
      position: analysis.position,
      contextSnippet: analysis.contextSnippet,
    });

    // Defer brand extraction - run in background without blocking
    // This removes another LLM call from the critical path
    storeBrandMentions(response.text, promptRunId).catch((err) => {
      console.error(
        `Background brand extraction failed for ${promptRunId}:`,
        err
      );
    });

    return {
      promptId: p.id,
      promptRunId,
      provider,
      success: true,
      mentioned: analysis.mentioned,
      responsePreview: response.text.slice(0, 200),
    };
  } catch (error) {
    console.error(`Error running prompt ${p.id}:`, error);

    return {
      promptId: p.id,
      promptRunId,
      provider,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Run prompts in parallel with a specified concurrency limit
 * Updates domain progress as EACH prompt completes (not batch-based)
 *
 * Uses a concurrent queue pattern for immediate progress updates
 */
export async function runPromptsInParallel(
  domainId: string,
  concurrency: number = 15,
  provider: LLMProvider = "chatgpt"
): Promise<RunResult[]> {
  const results: RunResult[] = [];

  // Get the domain
  const domainRecord = await db.query.domain.findFirst({
    where: eq(domain.id, domainId),
  });

  if (!domainRecord) {
    throw new Error(`Domain not found: ${domainId}`);
  }

  // Get all active prompts for this domain
  const activePrompts = await db.query.prompt.findMany({
    where: and(eq(prompt.domainId, domainId), eq(prompt.isActive, true)),
  });

  console.log(
    `Running ${
      activePrompts.length
    } prompts with concurrency ${concurrency} for domain ${
      domainRecord.domain
    }, brandName: ${domainRecord.name || "NULL"}`
  );

  let completedCount = 0;
  let pendingDbUpdate: Promise<void> | null = null;

  // Helper to update progress (debounced to avoid DB write contention)
  const updateProgress = async () => {
    // Skip if there's already a pending update
    if (pendingDbUpdate) return;

    pendingDbUpdate = db
      .update(domain)
      .set({ promptRunProgress: completedCount })
      .where(eq(domain.id, domainId))
      .then(() => {
        pendingDbUpdate = null;
      });
  };

  // Concurrent queue pattern - process all prompts with limited concurrency
  // Each prompt updates progress immediately when it completes
  const queue = activePrompts.map((p) => async () => {
    const result = await runSinglePromptSafe(
      p,
      domainRecord.domain,
      domainId,
      domainRecord.name,
      provider
    );

    // Update progress immediately when this prompt completes
    completedCount++;
    console.log(`Progress: ${completedCount}/${activePrompts.length}`);

    // Fire off progress update (don't await to avoid blocking)
    updateProgress();

    return result;
  });

  // Execute with concurrency limit using a semaphore pattern
  // Use a Set to avoid the indexOf/splice race condition when promises complete rapidly
  const executing = new Set<Promise<RunResult>>();

  for (const task of queue) {
    const promise = task().then((result) => {
      results.push(result);
      return result;
    });

    executing.add(promise);

    // Clean up the Set when this promise settles (use finally to ensure cleanup)
    const cleanup = promise.finally(() => {
      executing.delete(promise);
    });
    // Prevent unhandled rejection on the cleanup promise
    cleanup.catch(() => {});

    // When we hit the concurrency limit, wait for one to finish
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  // Wait for remaining tasks to complete
  await Promise.all(executing);

  // Wait for any pending DB update to complete
  if (pendingDbUpdate) {
    await pendingDbUpdate;
  }

  // Mark domain as completed with final count
  await db
    .update(domain)
    .set({
      promptRunStatus: "completed",
      promptRunProgress: completedCount,
    })
    .where(eq(domain.id, domainId));

  console.log(`Completed all ${completedCount} prompts for domain ${domainId}`);

  return results;
}
