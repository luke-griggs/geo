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
  domainName: string
): {
  mentioned: boolean;
  position: number | null;
  contextSnippet: string | null;
} {
  const lowerResponse = responseText.toLowerCase();
  const lowerDomain = domainName.toLowerCase();

  // Check for domain mention (with or without www)
  const domainVariants = [
    lowerDomain,
    `www.${lowerDomain}`,
    lowerDomain.replace("www.", ""),
  ];

  let mentioned = false;
  let position: number | null = null;
  let contextSnippet: string | null = null;

  for (const variant of domainVariants) {
    const index = lowerResponse.indexOf(variant);
    if (index !== -1) {
      mentioned = true;

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
        domainRecord.domain
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
      promptRecord.domain.domain
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
 */
async function runSinglePromptSafe(
  p: { id: string; promptText: string },
  domainName: string,
  domainId: string,
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
    const analysis = analyzeResponseForMentions(response.text, domainName);

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
 * Updates domain progress as prompts complete
 */
export async function runPromptsInParallel(
  domainId: string,
  concurrency: number = 5,
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
    `Running ${activePrompts.length} prompts in parallel (concurrency: ${concurrency}) for domain ${domainRecord.domain}`
  );

  let completedCount = 0;

  // Process prompts in batches
  for (let i = 0; i < activePrompts.length; i += concurrency) {
    const batch = activePrompts.slice(i, i + concurrency);

    // Run batch in parallel
    const batchResults = await Promise.all(
      batch.map((p) =>
        runSinglePromptSafe(p, domainRecord.domain, domainId, provider)
      )
    );

    results.push(...batchResults);
    completedCount += batchResults.length;

    // Update domain progress
    await db
      .update(domain)
      .set({
        promptRunProgress: completedCount,
      })
      .where(eq(domain.id, domainId));

    console.log(`Progress: ${completedCount}/${activePrompts.length}`);

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < activePrompts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Mark domain as completed
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
