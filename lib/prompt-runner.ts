import db from '@/db';
import { prompt, promptRun, mentionAnalysis, domain } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from './id';
import { runPromptAgainstLLM, isLLMError, type LLMProvider } from './llm';

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
): { mentioned: boolean; position: number | null; contextSnippet: string | null } {
  const lowerResponse = responseText.toLowerCase();
  const lowerDomain = domainName.toLowerCase();
  
  // Check for domain mention (with or without www)
  const domainVariants = [
    lowerDomain,
    `www.${lowerDomain}`,
    lowerDomain.replace('www.', ''),
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
      const linesBefore = textBefore.split(/[.\n]/).filter(s => s.trim().length > 0);
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
 * Run all active prompts for a specific domain
 */
export async function runPromptsForDomain(
  domainId: string,
  provider: LLMProvider = 'chatgpt'
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
    where: and(
      eq(prompt.domainId, domainId),
      eq(prompt.isActive, true)
    ),
  });
  
  console.log(`Running ${activePrompts.length} prompts for domain ${domainRecord.domain}`);
  
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
      
      // Store the successful run
      await db.insert(promptRun).values({
        id: promptRunId,
        promptId: p.id,
        llmProvider: provider,
        responseText: response.text,
        responseMetadata: response.metadata,
        durationMs: response.durationMs,
        executedAt: new Date(),
      });
      
      // Analyze for mentions
      const analysis = analyzeResponseForMentions(response.text, domainRecord.domain);
      
      // Store mention analysis
      await db.insert(mentionAnalysis).values({
        id: generateId(),
        promptRunId,
        domainId: domainId,
        mentioned: analysis.mentioned,
        position: analysis.position,
        contextSnippet: analysis.contextSnippet,
      });
      
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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    // Add a small delay between prompts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

/**
 * Run all active prompts for all domains across all workspaces
 * This is what the cron job calls
 */
export async function runAllPrompts(
  provider: LLMProvider = 'chatgpt'
): Promise<{ domainId: string; domainName: string; results: RunResult[] }[]> {
  const allResults: { domainId: string; domainName: string; results: RunResult[] }[] = [];
  
  // Get all domains that have active prompts
  const domainsWithPrompts = await db.query.domain.findMany({
    with: {
      prompts: {
        where: eq(prompt.isActive, true),
      },
    },
  });
  
  // Filter to only domains that have at least one active prompt
  const activeDomains = domainsWithPrompts.filter(d => d.prompts.length > 0);
  
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return allResults;
}

