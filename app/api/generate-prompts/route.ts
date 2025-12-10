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

    const systemPrompt = `You are an expert at crafting search queries that people would ask AI assistants like ChatGPT, Claude, or Perplexity. Given a topic and industry context, generate ${count} realistic search prompts.

IMPORTANT: The prompts should be about the INDUSTRY/SPACE as a whole, NOT specific to any particular brand. The goal is to see how often a brand naturally shows up in responses to general industry questions.

The prompts should:
- Sound natural, like how a real person would ask an AI assistant
- Be specific enough to trigger meaningful responses
- Vary in intent (informational, comparison, recommendation, problem-solving)
- Include the company/brand name where appropriate
- Be 10-50 words each

Categories:
- "brand": Direct questions about who the leaders are in the space
- "product": Product category queries
- "comparison": Comparing options or alternatives in the space
- "recommendation": Asking for suggestions on what to choose
- "problem_solution": Looking to solve a specific problem

Return ONLY a valid JSON array of objects with "text" and "category" fields. Do not include anything except the json array in your resposne 

Example output for a scheduling software company:
[
  {"text": "What is the best scheduling software for small businesses?", "category": "recommendation"},
  {"text": "What are the top appointment booking tools for service businesses?", "category": "brand"},
  {"text": "I need help setting up automated appointment reminders for my salon", "category": "problem_solution"},
  {"text": "Which online scheduling platforms integrate with Google Calendar?", "category": "comparison"}
]`;

    const userPrompt = `Topic: ${topic}
Industry Context: ${workspaceName || domain} operates in this space

Generate ${count} search prompts that someone interested in "${topic}" might ask an AI assistant. Remember: these should be GENERAL industry questions, not specific to any brand.`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          response_format: { type: "json_object" },
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
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

      const parsed = JSON.parse(cleanedContent);

      // Handle both direct array and wrapped object responses
      let prompts: GeneratedPrompt[];
      if (Array.isArray(parsed)) {
        prompts = parsed;
      } else if (parsed.prompts && Array.isArray(parsed.prompts)) {
        prompts = parsed.prompts;
      } else if (parsed.response && Array.isArray(parsed.response)) {
        prompts = parsed.response;
      } else {
        // Try to find any array property
        const arrayProp = Object.values(parsed).find((v) => Array.isArray(v));
        if (arrayProp) {
          prompts = arrayProp as GeneratedPrompt[];
        } else {
          console.error("No array found in response:", parsed);
          return NextResponse.json(
            { error: "Invalid response format" },
            { status: 500 }
          );
        }
      }

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
