import { generateId } from './id';

export type LLMProvider = 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'grok' | 'deepseek';

export interface LLMResponse {
  text: string;
  metadata: {
    model: string;
    tokensUsed?: number;
    finishReason?: string;
  };
  durationMs: number;
}

export interface LLMError {
  error: string;
  provider: LLMProvider;
}

/**
 * Run a prompt against OpenAI's ChatGPT
 */
export async function runOpenAI(promptText: string): Promise<LLMResponse | LLMError> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return { error: 'OPENAI_API_KEY not configured', provider: 'chatgpt' };
  }

  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant providing information about products, services, and recommendations. Be thorough and mention specific brands, websites, and tools when relevant.',
          },
          {
            role: 'user',
            content: promptText,
          },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      return { error: `OpenAI API error: ${error}`, provider: 'chatgpt' };
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      text: choice?.message?.content || '',
      metadata: {
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
        finishReason: choice?.finish_reason,
      },
      durationMs,
    };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      provider: 'chatgpt' 
    };
  }
}

/**
 * Run a prompt against a specified LLM provider
 * Currently only OpenAI is implemented, but this can be extended
 */
export async function runPromptAgainstLLM(
  promptText: string, 
  provider: LLMProvider
): Promise<LLMResponse | LLMError> {
  switch (provider) {
    case 'chatgpt':
      return runOpenAI(promptText);
    
    // Add other providers here as needed
    case 'claude':
    case 'perplexity':
    case 'gemini':
    case 'grok':
    case 'deepseek':
      return { error: `Provider ${provider} not yet implemented`, provider };
    
    default:
      return { error: `Unknown provider: ${provider}`, provider };
  }
}

/**
 * Check if a response contains an error
 */
export function isLLMError(response: LLMResponse | LLMError): response is LLMError {
  return 'error' in response;
}

