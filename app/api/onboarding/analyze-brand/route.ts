import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  runOpenAI,
  isLLMError,
  extractBrandsWithGroq,
  isBrandExtractionError,
  type ExtractedBrand,
} from "@/lib/llm";

interface BrandAnalysis {
  brandName: string;
  industry: string;
  description: string;
  prompts: string[];
}

interface CompetitorRanking {
  name: string;
  domain: string | null;
  mentionCount: number;
}

export interface OnboardingAnalysisResult {
  brandName: string;
  domain: string;
  industry: string;
  visibilityScore: number;
  rank: number | null;
  competitors: CompetitorRanking[];
  totalMentions: number;
  totalPrompts: number;
}

/**
 * Analyze a website using Groq's compound model with visit_website tool
 */
async function analyzeWebsite(domain: string): Promise<BrandAnalysis | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY not configured");
    return null;
  }

  const systemPrompt = `You are an expert at analyzing websites to understand brands. Visit the provided URL and determine:
1. The brand/company name (properly capitalized)
2. What industry or product category they operate in (e.g., "Musical Instruments", "Scheduling Software", "E-commerce Platform")
3. A brief description of what they do and who they serve

Then generate 5 prompts that a curious user might ask an AI assistant about that industry (NOT about the brand itself). These prompts should:
- Be from the perspective of someone researching or shopping in that space
- Have natural, human-like phrasing - occasionally include slight imprecision or casual wording
- Cover different intents: recommendations, comparisons, how-to questions, best options

IMPORTANT: Return ONLY valid JSON in this exact format, no markdown or explanations:
{"brandName": "Example Corp", "industry": "Category Name", "description": "Brief description", "prompts": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5"]}`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Groq-Model-Version": "latest",
        },
        body: JSON.stringify({
          model: "groq/compound",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `https://${domain}` },
          ],
          temperature: 0.7,
          max_completion_tokens: 1024,
          compound_custom: {
            tools: {
              enabled_tools: ["visit_website"],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq compound API error:", error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in Groq response");
      return null;
    }

    // Parse the JSON response
    try {
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const analysis: BrandAnalysis = JSON.parse(cleanedContent);

      // Validate the response
      if (
        !analysis.brandName ||
        !analysis.industry ||
        !analysis.prompts ||
        !Array.isArray(analysis.prompts) ||
        analysis.prompts.length === 0
      ) {
        console.error("Invalid brand analysis response:", analysis);
        return null;
      }

      // Ensure we have exactly 5 prompts
      analysis.prompts = analysis.prompts.slice(0, 5);

      return analysis;
    } catch {
      console.error("Failed to parse brand analysis response:", content);
      return null;
    }
  } catch (error) {
    console.error("Error analyzing website:", error);
    return null;
  }
}

/**
 * Check if a domain/brand is mentioned in a response
 */
function checkBrandMention(
  responseText: string,
  domain: string,
  brandName: string
): boolean {
  const lowerResponse = responseText.toLowerCase();
  const lowerDomain = domain.toLowerCase().replace(/^www\./, "");
  const lowerBrandName = brandName.toLowerCase();

  // Check for domain mention
  if (
    lowerResponse.includes(lowerDomain) ||
    lowerResponse.includes(`www.${lowerDomain}`)
  ) {
    return true;
  }

  // Check for brand name mention
  if (lowerResponse.includes(lowerBrandName)) {
    return true;
  }

  return false;
}

/**
 * Calculate visibility rank based on mention count
 */
function calculateRank(
  brandMentions: number,
  competitors: CompetitorRanking[]
): number | null {
  if (brandMentions === 0) {
    // Brand not mentioned, calculate position after all competitors
    return competitors.length > 0 ? competitors.length + 1 : null;
  }

  // Sort competitors by mention count descending
  const sorted = [...competitors].sort(
    (a, b) => b.mentionCount - a.mentionCount
  );

  // Find where the brand would rank
  let rank = 1;
  for (const competitor of sorted) {
    if (competitor.mentionCount > brandMentions) {
      rank++;
    } else {
      break;
    }
  }

  return rank;
}

// POST /api/onboarding/analyze-brand
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Clean the domain
    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0];

    // Step 1: Analyze the website to understand the brand and generate prompts
    console.log(`[analyze-brand] Analyzing website: ${cleanDomain}`);
    const brandAnalysis = await analyzeWebsite(cleanDomain);

    if (!brandAnalysis) {
      return NextResponse.json(
        { error: "Failed to analyze website" },
        { status: 500 }
      );
    }

    console.log(
      `[analyze-brand] Brand: ${brandAnalysis.brandName}, Industry: ${brandAnalysis.industry}`
    );
    console.log(
      `[analyze-brand] Generated ${brandAnalysis.prompts.length} prompts`
    );

    // Step 2: Run prompts against ChatGPT in parallel
    console.log(
      `[analyze-brand] Running ${brandAnalysis.prompts.length} prompts in parallel...`
    );

    const promptResults = await Promise.all(
      brandAnalysis.prompts.map(async (promptText) => {
        console.log(
          `[analyze-brand] Running prompt: ${promptText.slice(0, 50)}...`
        );

        const response = await runOpenAI(promptText);

        if (isLLMError(response)) {
          console.error(`[analyze-brand] LLM error: ${response.error}`);
          return { mentioned: false, brands: [] as ExtractedBrand[] };
        }

        // Check if our brand was mentioned
        const mentioned = checkBrandMention(
          response.text,
          cleanDomain,
          brandAnalysis.brandName
        );

        // Extract competitor brands from response
        const brandsResult = await extractBrandsWithGroq(response.text);
        const brands = isBrandExtractionError(brandsResult)
          ? []
          : brandsResult.brands;

        return { mentioned, brands };
      })
    );

    // Aggregate results
    const allBrands: ExtractedBrand[] = [];
    let brandMentionCount = 0;

    for (const result of promptResults) {
      if (result.mentioned) {
        brandMentionCount++;
      }
      allBrands.push(...result.brands);
    }

    // Step 3: Aggregate competitor mentions
    const competitorMap = new Map<string, CompetitorRanking>();

    for (const brand of allBrands) {
      const key = brand.name.toLowerCase();

      // Skip if this is our own brand
      if (
        key === brandAnalysis.brandName.toLowerCase() ||
        brand.domain?.includes(cleanDomain)
      ) {
        continue;
      }

      if (competitorMap.has(key)) {
        const existing = competitorMap.get(key)!;
        existing.mentionCount++;
      } else {
        competitorMap.set(key, {
          name: brand.name,
          domain: brand.domain,
          mentionCount: 1,
        });
      }
    }

    // Convert to array and sort by mention count
    const competitors = Array.from(competitorMap.values())
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 10); // Top 10 competitors

    // Step 4: Calculate visibility metrics
    const rank = calculateRank(brandMentionCount, competitors);
    const totalPrompts = brandAnalysis.prompts.length;

    // Visibility score: percentage of prompts where brand was mentioned
    const visibilityScore = Math.round(
      (brandMentionCount / totalPrompts) * 100
    );

    const result: OnboardingAnalysisResult = {
      brandName: brandAnalysis.brandName,
      domain: cleanDomain,
      industry: brandAnalysis.industry,
      visibilityScore,
      rank,
      competitors,
      totalMentions: brandMentionCount,
      totalPrompts,
    };

    console.log(
      `[analyze-brand] Analysis complete. Rank: ${rank}, Visibility: ${visibilityScore}%`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[analyze-brand] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze brand" },
      { status: 500 }
    );
  }
}
