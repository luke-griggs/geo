import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization, contentProject } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
    projectId: string;
  }>;
}

/**
 * Build the prompt for GPT 5.1 based on template type and available context
 */
function buildPrompt(
  keyword: string,
  title: string,
  template: string,
  citations: string[]
): string {
  // Template-specific instructions
  const templateInstructions: Record<string, string> = {
    blog_post: `Write a comprehensive, engaging blog post. Structure it with:
- An attention-grabbing introduction
- Clear sections with descriptive headings (H2, H3)
- Practical insights and actionable advice
- A strong conclusion with key takeaways
The tone should be professional yet conversational.`,
    listicle: `Write an engaging listicle article. Structure it with:
- A brief introduction explaining the topic
- Numbered items (aim for 7-10 items)
- Each item should have a descriptive heading and 2-3 paragraphs of detail
- A brief conclusion
Make each item valuable and actionable.`,
    smart_suggestion: `Analyze the topic and determine the best article format (listicle, guide, how-to, comparison, etc.) based on what would be most helpful for readers searching for this topic. Then write the article using that optimal format.`,
  };

  const formatInstruction =
    templateInstructions[template] || templateInstructions.smart_suggestion;

  const hasCitations = citations.length > 0;

  if (hasCitations) {
    // When we have citations, include them as reference sources
    const citationList = citations
      .map((url, i) => `${i + 1}. ${url}`)
      .join("\n");

    return `You are an expert SEO content writer. Write a solid article that will rank well in search engines.

ARTICLE TITLE: "${title}"
TARGET KEYWORD: "${keyword}"

FORMAT INSTRUCTIONS:
${formatInstruction}

REFERENCE SOURCES (use these as inspiration, but write original content):
${citationList}

A few notes:
- Don't overthink this - just skim the references to get the gist and then start writing. You don't need to deeply analyze every source.
- Aim for around 800-1200 words - enough to be helpful but don't pad it out.
- Use markdown formatting (headings, lists, bold) where it makes sense.
- Include the target keyword naturally - don't force it.

Go ahead and write the article in markdown.`;
  } else {
    // When no citations, use web search to research the topic
    return `You are an expert SEO content writer. Write a solid article on this topic.

ARTICLE TITLE: "${title}"
TARGET KEYWORD: "${keyword}"

FORMAT INSTRUCTIONS:
${formatInstruction}

A few notes:
- If you need to look something up, a quick search is fine - but don't go overboard with research. Get a good sense of the topic and start writing.
- Aim for around 800-1200 words - enough to be helpful but don't pad it out.
- Use markdown formatting (headings, lists, bold) where it makes sense.
- Include the target keyword naturally - don't force it.
- Just make sure the facts are accurate.

Go ahead and write the article in markdown.`;
  }
}

/**
 * Generate article content using GPT 5.1 with web search
 */
async function generateArticleWithGPT(
  keyword: string,
  title: string,
  template: string,
  citations: string[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const prompt = buildPrompt(keyword, title, template, citations);
  const hasCitations = citations.length > 0;

  console.log(
    `Generating article with GPT 5.1 (web_search: ${
      hasCitations ? "auto" : "required"
    })...`
  );

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: prompt,
      model: "gpt-5.1",
      tools: [{ type: "web_search" }],
      reasoning: {
        effort: "none",
      },
      // Cap output to ~1200 words (roughly 2500 tokens with markdown)
      // Use auto for tool choice - required forces extensive searches which is slow
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();

  // Extract text from the nested response structure
  let text = "";

  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      // Extract text from message items
      if (
        item.type === "message" &&
        item.content &&
        Array.isArray(item.content)
      ) {
        for (const contentItem of item.content) {
          if (contentItem.type === "output_text" && contentItem.text) {
            text += contentItem.text;
          }
        }
      }
    }
  }

  if (!text) {
    throw new Error("No content generated");
  }

  return text;
}

// POST /api/organizations/:organizationId/domains/:domainId/content/:projectId/generate
// Generates article with GPT 5.1 using web search for research
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId, projectId } = await params;

    // Verify organization ownership
    const orgRecord = await db.query.organization.findFirst({
      where: and(
        eq(organization.id, organizationId),
        eq(organization.userId, session.user.id)
      ),
    });

    if (!orgRecord) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Verify domain belongs to organization
    const domainRecord = await db.query.domain.findFirst({
      where: and(
        eq(domain.id, domainId),
        eq(domain.workspaceId, organizationId)
      ),
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Get the content project
    const project = await db.query.contentProject.findFirst({
      where: and(
        eq(contentProject.id, projectId),
        eq(contentProject.domainId, domainId)
      ),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Content project not found" },
        { status: 404 }
      );
    }

    if (!project.title) {
      return NextResponse.json(
        { error: "Project title is required" },
        { status: 400 }
      );
    }

    if (!project.template) {
      return NextResponse.json(
        { error: "Template is required" },
        { status: 400 }
      );
    }

    // Mark project as generating
    await db
      .update(contentProject)
      .set({ status: "generating" })
      .where(eq(contentProject.id, projectId));

    try {
      // Get citations from selected pages
      const selectedPages = project.selectedPages as string[] | null;
      const citations = selectedPages || [];

      console.log(
        `Generating article with ${citations.length} citations for: "${project.title}"`
      );

      // Generate the article with GPT 5.1
      const generatedContent = await generateArticleWithGPT(
        project.keyword,
        project.title,
        project.template,
        citations
      );

      // Update project with generated content
      const [updatedProject] = await db
        .update(contentProject)
        .set({
          status: "completed",
          generatedContent,
        })
        .where(eq(contentProject.id, projectId))
        .returning();

      return NextResponse.json({
        project: updatedProject,
        content: generatedContent,
      });
    } catch (error) {
      // Mark project as failed
      await db
        .update(contentProject)
        .set({ status: "failed" })
        .where(eq(contentProject.id, projectId));

      throw error;
    }
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      {
        error: "Failed to generate content",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
