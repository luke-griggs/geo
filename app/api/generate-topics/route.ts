import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface TopicSuggestion {
  name: string;
  description: string;
}

// POST /api/generate-topics
// Generates topic suggestions for a domain using AI
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domain, workspaceName } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
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

    const systemPrompt = `You are an expert at understanding businesses and their target audiences. Given a company website domain and optionally their company name, generate a list of 10 relevant topics that people might search for when looking for products or services like theirs.

These topics should be:
- Short phrases (2-5 words) that represent search intent
- Focused on what the business offers or problems they solve
- Relevant to how people actually search in AI assistants like ChatGPT

Return ONLY a valid JSON array of objects with "name" and "description" fields. No markdown, no explanations.

Example output:
[
  {"name": "Best scheduling software", "description": "Users looking for appointment scheduling tools"},
  {"name": "Calendly vs competitors", "description": "Comparison searches between your brand and others"},
  {"name": "Free booking app", "description": "Users seeking no-cost scheduling solutions"}
]`;

    const userPrompt = workspaceName
      ? `Domain: ${domain}\nCompany Name: ${workspaceName}`
      : `Domain: ${domain}`;

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
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      return NextResponse.json(
        { error: "Failed to generate topics" },
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

      const topics: TopicSuggestion[] = JSON.parse(cleanedContent);

      // Validate the response
      const validatedTopics = topics
        .filter(
          (t) =>
            typeof t.name === "string" &&
            t.name.length > 0 &&
            t.name.length <= 100
        )
        .slice(0, 10) // Max 10 topics
        .map((t) => ({
          name: t.name,
          description: t.description || "",
        }));

      return NextResponse.json({ topics: validatedTopics });
    } catch {
      console.error("Failed to parse topic response:", content);
      return NextResponse.json(
        { error: "Failed to parse topic suggestions" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating topics:", error);
    return NextResponse.json(
      { error: "Failed to generate topics" },
      { status: 500 }
    );
  }
}


