import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// POST /api/generate-titles
// Generates title suggestions for a keyword using AI
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { keyword, topic } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY not configured, returning fallback titles");
      // Return fallback titles if API not configured
      return NextResponse.json({
        titles: generateFallbackTitles(keyword),
      });
    }

    const systemPrompt = `You are a senior content strategist. Generate 3 article titles for the given topic.

CRITICAL RULES:
- NO generic patterns like "Ultimate Guide", "Everything You Need to Know", "Complete Guide", "X vs Y Showdown", "How X Stack Up"
- NO listicle formats like "Top 10", "Best X of 2024"
- NO question formats unless genuinely compelling
- Each title must have a SPECIFIC angle, insight, or hook that makes someone want to read
- Write like a journalist, not an SEO robot
- Be direct and confident - avoid hedging words

Good examples:
- "The Hidden Cost of Cloud Migration Nobody Talks About"
- "Why Your API Gateway Is Probably Overkill"  
- "I Tested 50 LLMs. Here's What Actually Matters."

Bad examples (DO NOT write like this):
- "Cloud Migration: A Complete Guide"
- "API Gateways Explained: Everything You Need to Know"
- "Comparing the Best LLMs of 2024"

Return a JSON object: {"titles": ["Title 1", "Title 2", "Title 3"]}`;

    const userMessage = topic
      ? `Topic: ${topic}\nPrompt/Keyword: ${keyword}`
      : `Keyword: ${keyword}`;

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
            { role: "user", content: userMessage },
          ],
          temperature: 0.9,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      // Return fallback
      return NextResponse.json({
        titles: generateFallbackTitles(keyword),
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in Groq response");
      return NextResponse.json({
        titles: generateFallbackTitles(keyword),
      });
    }

    try {
      const parsed = JSON.parse(content);

      // Handle both array and object with titles key
      const titles = Array.isArray(parsed) ? parsed : parsed.titles;

      if (Array.isArray(titles) && titles.length > 0) {
        return NextResponse.json({
          titles: titles.filter((t) => typeof t === "string").slice(0, 3),
        });
      }
    } catch (parseError) {
      console.error("Failed to parse title response:", content, parseError);
    }

    // Fallback
    return NextResponse.json({
      titles: generateFallbackTitles(keyword),
    });
  } catch (error) {
    console.error("Error generating titles:", error);
    return NextResponse.json(
      { error: "Failed to generate titles" },
      { status: 500 }
    );
  }
}

// Generate varied fallback titles when API is unavailable
function generateFallbackTitles(keyword: string): string[] {
  const capitalizedKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1);

  const templates = [
    `What Most People Get Wrong About ${capitalizedKeyword}`,
    `The Case for Rethinking ${capitalizedKeyword}`,
    `${capitalizedKeyword}: A Practical Take`,
  ];

  return templates;
}
