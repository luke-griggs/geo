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
    const { keyword } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      // Return fallback titles if API not configured
      return NextResponse.json({
        titles: [
          `${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          }: A Complete Guide`,
          `Top 10 ${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          } You Need to Know`,
          `The Ultimate Guide to ${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          }`,
        ],
      });
    }

    const systemPrompt = `You are an SEO expert that creates compelling, click-worthy article titles. Generate 5 unique title suggestions for the given keyword. The titles should be:
- Engaging and click-worthy
- SEO-optimized (include the keyword naturally)
- Varied in style (some listicles, some guides, some questions)
- Between 40-60 characters when possible

Return ONLY a JSON array of title strings. No explanations, no markdown.

Example output:
["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`;

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
            { role: "user", content: `Keyword: ${keyword}` },
          ],
          temperature: 0.8,
          max_tokens: 512,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      // Return fallback
      return NextResponse.json({
        titles: [
          `${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          }: A Complete Guide`,
          `Top 10 ${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          } You Need to Know`,
          `The Ultimate Guide to ${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          }`,
        ],
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        titles: [
          `${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          }: A Complete Guide`,
        ],
      });
    }

    try {
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const titles = JSON.parse(cleanedContent);

      if (Array.isArray(titles)) {
        return NextResponse.json({
          titles: titles.filter((t) => typeof t === "string").slice(0, 5),
        });
      }
    } catch {
      console.error("Failed to parse title response:", content);
    }

    // Fallback
    return NextResponse.json({
      titles: [
        `${
          keyword.charAt(0).toUpperCase() + keyword.slice(1)
        }: A Complete Guide`,
      ],
    });
  } catch (error) {
    console.error("Error generating titles:", error);
    return NextResponse.json(
      { error: "Failed to generate titles" },
      { status: 500 }
    );
  }
}

