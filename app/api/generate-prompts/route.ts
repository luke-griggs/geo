import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface GeneratedPrompt {
  text: string;
  category:
    | "brand"
    | "product"
    | "comparison"
    | "recommendation"
    | "problem_solution";
}

// POST /api/generate-prompts
// Generates prompts for a topic using AI
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, domain, workspaceName, count = 5 } = body;

    if (!topic || !domain) {
      return NextResponse.json(
        { error: "Topic and domain are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert at crafting search queries that people would ask AI assistants like ChatGPT, Claude, or Perplexity. Given a topic and company context, generate ${count} realistic search prompts.

The prompts should:
- Sound natural, like how a real person would ask an AI assistant
- Be specific enough to trigger meaningful responses
- Vary in intent (informational, comparison, recommendation, problem-solving)
- Include the company/brand name where appropriate
- Be 10-50 words each

Categories:
- "brand": Direct brand/company related questions
- "product": Product-specific queries
- "comparison": Comparing options or alternatives
- "recommendation": Asking for suggestions
- "problem_solution": Looking to solve a specific problem

Return ONLY a valid JSON array of objects with "text" and "category" fields. No markdown, no explanations.

Example output:
[
  {"text": "What is the best scheduling software for small businesses?", "category": "recommendation"},
  {"text": "How does Calendly compare to Acuity Scheduling?", "category": "comparison"},
  {"text": "I need to set up automated appointment booking for my salon", "category": "problem_solution"}
]`;

    const userPrompt = `Topic: ${topic}
Domain: ${domain}
Company: ${workspaceName || domain}

Generate ${count} search prompts that someone interested in "${topic}" might ask an AI assistant.`;

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
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8, // Slightly higher for variety
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      return NextResponse.json(
        { error: "Failed to generate prompts" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    try {
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const prompts: GeneratedPrompt[] = JSON.parse(cleanedContent);

      // Validate the response
      const validCategories = [
        "brand",
        "product",
        "comparison",
        "recommendation",
        "problem_solution",
      ];
      const validatedPrompts = prompts
        .filter(
          (p) =>
            typeof p.text === "string" &&
            p.text.length > 0 &&
            p.text.length <= 500
        )
        .slice(0, count)
        .map((p) => ({
          text: p.text,
          category: validCategories.includes(p.category) ? p.category : "brand",
        }));

      return NextResponse.json({ prompts: validatedPrompts });
    } catch {
      console.error("Failed to parse prompt response:", content);
      return NextResponse.json(
        { error: "Failed to parse prompt suggestions" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating prompts:", error);
    return NextResponse.json(
      { error: "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
