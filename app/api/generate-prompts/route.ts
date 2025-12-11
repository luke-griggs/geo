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

    const systemPrompt = `You are an expert at crafting search queries that people would ask AI assistants like ChatGPT, Claude, or Perplexity.

Generate ${count} questions that a user might ask about "${topic}" - these should be about the PRODUCT CATEGORY/INDUSTRY, **NOT about any specific brand**. The goal is to see how often brands naturally show up in responses to general industry questions.

These prompts should:
- Have natural, HUMAN-LIKE phrasing. occasionally include slight imprecision or casual wording
- These prompts should have absolutely zero resemblance to ai generated text. No, em-dashes
- Cover different intents: recommendations, comparisons, how-to questions, best options

for example, if the topic is "electric guitars", the prompts generated would look like:

"what are some good guitars for beginners"
"give me some recommendations for guitar amps"
"whats the difference between single coil and humbucker pickups"
"i want to learn guitar, what should i buy first"

IMPORTANT: Return ONLY valid JSON in this exact format, no markdown, reasoning, or explanations:

Think carefully and deeply ponder the fact that I'm asking you to return only JSON in your final response. So while you're thinking, think about your output being JSON only. Do not output anything except for JSON. DO NOT output any paragraphs explaining what you're doing. DO NOT give an overview. RETURN JSON. I want you to ponder this while you're thinking. It is important that your response only includes json in the form below

{"prompts": [{"text": "prompt 1", "category": "recommendation"}, {"text": "prompt 2", "category": "comparison"}, ...]}`;

    const userPrompt = `Topic: ${topic}
Industry/Company: ${workspaceName || domain}

Generate ${count} prompts.`;

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
          model: "groq/compound-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 1,
          max_completion_tokens: 1024,
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
