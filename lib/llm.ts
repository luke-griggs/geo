export type LLMProvider =
  | "chatgpt"
  | "claude"
  | "perplexity"
  | "gemini"
  | "grok"
  | "deepseek";

export interface UrlCitation {
  url: string;
  title: string;
  snippet?: string;
}

export interface LLMResponse {
  text: string;
  metadata: {
    model: string;
    tokensUsed?: number;
    finishReason?: string;
  };
  durationMs: number;
  searchQueries?: string[]; // queries the model passed to the web search tool
  citations?: UrlCitation[]; // url_citation annotations from web search
}

/**
 * Fetch meta description from a URL
 * Returns the og:description or meta description tag content
 */
async function fetchMetaDescription(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GeoBot/1.0; +https://example.com)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return undefined;

    const html = await response.text();

    // Try og:description first (usually more detailed)
    const ogDescMatch = html.match(
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
    );
    if (ogDescMatch?.[1]) {
      return ogDescMatch[1].trim();
    }

    // Also try the reverse attribute order
    const ogDescMatchAlt = html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i
    );
    if (ogDescMatchAlt?.[1]) {
      return ogDescMatchAlt[1].trim();
    }

    // Fall back to regular meta description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    );
    if (descMatch?.[1]) {
      return descMatch[1].trim();
    }

    // Also try reverse order for meta description
    const descMatchAlt = html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i
    );
    if (descMatchAlt?.[1]) {
      return descMatchAlt[1].trim();
    }

    return undefined;
  } catch {
    // Silently fail - description is optional
    return undefined;
  }
}

/**
 * Enrich citations with meta descriptions from the URLs
 */
export async function enrichCitationsWithDescriptions(
  citations: UrlCitation[]
): Promise<UrlCitation[]> {
  const enrichedCitations = await Promise.all(
    citations.map(async (citation) => {
      if (citation.snippet) return citation; // Already has a snippet

      const description = await fetchMetaDescription(citation.url);
      return {
        ...citation,
        snippet: description,
      };
    })
  );

  return enrichedCitations;
}

export interface LLMError {
  error: string;
  provider: LLMProvider;
}

/**
 * Run a prompt against OpenAI's ChatGPT
 */
export async function runOpenAI(
  promptText: string
): Promise<LLMResponse | LLMError> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { error: "OPENAI_API_KEY not configured", provider: "chatgpt" };
  }

  const startTime = Date.now();

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: promptText,
        model: "gpt-5.1",
        tools: [{ type: "web_search" }],
        reasoning: {
          effort: "none",
        },
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      return { error: `OpenAI API error: ${error}`, provider: "chatgpt" };
    }

    const data = await response.json();

    // Extract text from the nested response structure
    // The output_text field is SDK-only, so we need to manually parse the output array
    let text = "";
    const searchQueries: string[] = [];
    const citations: UrlCitation[] = [];
    const seenUrls = new Set<string>(); // Deduplicate citations by URL

    if (data.output && Array.isArray(data.output)) {
      for (const item of data.output) {
        // Extract search queries from web_search_call items
        if (item.type === "web_search_call" && item.action?.query) {
          searchQueries.push(item.action.query);
        }

        // Extract text and citations from message items
        if (
          item.type === "message" &&
          item.content &&
          Array.isArray(item.content)
        ) {
          for (const contentItem of item.content) {
            if (contentItem.type === "output_text" && contentItem.text) {
              text += contentItem.text;

              // Extract url_citation annotations
              if (
                contentItem.annotations &&
                Array.isArray(contentItem.annotations)
              ) {
                for (const annotation of contentItem.annotations) {
                  if (
                    annotation.type === "url_citation" &&
                    annotation.url &&
                    !seenUrls.has(annotation.url)
                  ) {
                    seenUrls.add(annotation.url);
                    citations.push({
                      url: annotation.url,
                      title: annotation.title || "",
                      snippet: annotation.snippet || undefined,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      text,
      metadata: {
        model: data.model,
        tokensUsed: data.usage?.total_tokens,
        finishReason: data.status,
      },
      durationMs,
      searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
      citations: citations.length > 0 ? citations : undefined,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      provider: "chatgpt",
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
    case "chatgpt":
      return runOpenAI(promptText);

    // Add other providers here as needed
    case "claude":
    case "perplexity":
    case "gemini":
    case "grok":
    case "deepseek":
      return { error: `Provider ${provider} not yet implemented`, provider };

    default:
      return { error: `Unknown provider: ${provider}`, provider };
  }
}

/**
 * Check if a response contains an error
 */
export function isLLMError(
  response: LLMResponse | LLMError
): response is LLMError {
  return "error" in response;
}

// ============================================
// Brand Extraction using Groq
// ============================================
// TODO: we need a better way to extract brands from a response, this is a hacky solution

export interface ExtractedBrand {
  name: string;
  domain: string | null; // e.g., "calendly.com" for favicon lookup
  position: number;
  citationUrl: string | null;
}

export interface BrandExtractionResult {
  brands: ExtractedBrand[];
}

export interface BrandExtractionError {
  error: string;
}

/**
 * Extract brands/companies mentioned in an LLM response using Groq
 */
export async function extractBrandsWithGroq(
  responseText: string
): Promise<BrandExtractionResult | BrandExtractionError> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { error: "GROQ_API_KEY not configured" };
  }

  const systemPrompt = `You are a brand extraction assistant. Your job is to analyze text and identify product/service brands that are being recommended or discussed as options.

INCLUDE:
- Product brands (e.g., Trek, Specialized, Nike, Apple)
- Software/SaaS brands (e.g., Calendly, Slack, Notion)
- Service provider brands (e.g., Acuity Scheduling, Squarespace)

DO NOT INCLUDE:
- Retailers or stores (e.g., REI, Amazon, Best Buy, Walmart)
- Blogs, publications, or media sites (e.g., Outdoor Life, TechCrunch, Wirecutter)
- Review sites or aggregators (e.g., Yelp, TripAdvisor)
- Sources/citations - only extract the actual brands being recommended, not who recommended them

For each brand you find, return:
- name: The brand/company name (properly capitalized)
- domain: The brand's official website domain (e.g., "calendly.com", "trekbikes.com"). Just the domain, no https:// or paths.
- position: The order in which it appears (1 for first, 2 for second, etc.)
- citationUrl: If a URL is associated with this brand in the text, include it. Otherwise null.

Return ONLY a valid JSON array of brand objects. No explanations, no markdown, just the JSON array.

Example output:
[{"name": "Calendly", "domain": "calendly.com", "position": 1, "citationUrl": null}, {"name": "Acuity Scheduling", "domain": "acuityscheduling.com", "position": 2, "citationUrl": "https://acuityscheduling.com"}]

If no brands are mentioned, return an empty array: []`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: responseText,
            },
          ],
          temperature: 0.5, // Low temperature for consistent extraction
          max_tokens: 1024,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { error: `Groq API error: ${error}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { error: "No content in Groq response" };
    }

    // Parse the JSON response
    try {
      // Clean up the response in case there's any markdown formatting
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const brands: ExtractedBrand[] = JSON.parse(cleanedContent);

      // Validate and normalize the response
      const validatedBrands = brands
        .filter(
          (b) =>
            typeof b.name === "string" &&
            b.name.length > 0 &&
            typeof b.position === "number"
        )
        .map((b) => ({
          name: b.name,
          domain: typeof b.domain === "string" ? b.domain : null,
          position: b.position,
          citationUrl: typeof b.citationUrl === "string" ? b.citationUrl : null,
        }));

      return { brands: validatedBrands };
    } catch {
      console.error("Failed to parse Groq brand extraction response:", content);
      return { error: "Failed to parse brand extraction response" };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function isBrandExtractionError(
  result: BrandExtractionResult | BrandExtractionError
): result is BrandExtractionError {
  return "error" in result;
}
