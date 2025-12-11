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

interface SerpResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    content?: string;
  };
  error?: string;
}

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
}

/**
 * Scrape a single URL using Firecrawl
 */
async function scrapeWithFirecrawl(url: string): Promise<ScrapedPage | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error("FIRECRAWL_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl error for ${url}:`, errorText);
      return null;
    }

    const data: FirecrawlResponse = await response.json();

    if (!data.success || !data.data?.markdown) {
      console.error(`Firecrawl failed for ${url}:`, data.error);
      return null;
    }

    // Extract title from markdown (first h1) or use URL
    const titleMatch = data.data.markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : url;

    return {
      url,
      title,
      content: data.data.markdown,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

/**
 * Generate article content using Groq
 */
async function generateArticle(
  keyword: string,
  title: string,
  template: string,
  scrapedPages: ScrapedPage[]
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Build context from scraped pages
  const contextParts = scrapedPages.map((page, index) => {
    // Truncate content to avoid token limits
    const truncatedContent = page.content.slice(0, 3000);
    return `--- SOURCE ${index + 1}: ${page.title} (${
      page.url
    }) ---\n${truncatedContent}\n`;
  });
  const context = contextParts.join("\n\n");

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
    smart_suggestion: `Analyze the top-ranking content and write an article that:
- Covers the most important points from the sources
- Uses the best structure based on what's ranking well
- Provides unique value and insights
- Is comprehensive yet easy to read
Decide the best format (listicle, guide, how-to, etc.) based on the content.`,
  };

  const systemPrompt = `You are an expert SEO content writer. Your task is to write high-quality, original content that can rank well in search engines.

IMPORTANT GUIDELINES:
- Write original content inspired by the sources, do NOT copy text directly
- Focus on providing genuine value to readers
- Use proper markdown formatting (headings, lists, bold, etc.)
- Include relevant keywords naturally (target keyword: "${keyword}")
- Make the content comprehensive and thorough
- Write in a clear, engaging style

${templateInstructions[template] || templateInstructions.smart_suggestion}`;

  const userPrompt = `Write an article with the title: "${title}"

Target keyword: ${keyword}

Use the following top-ranking content as research and inspiration:

${context}

Write the complete article in markdown format.`;

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
        max_tokens: 4096,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content generated");
  }

  return content;
}

// POST /api/organizations/:organizationId/domains/:domainId/content/:projectId/generate
// Scrapes selected pages with Firecrawl and generates article with LLM
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
      // Get URLs to scrape
      const serpResults = project.serpResults as SerpResult[] | null;
      const selectedPages = project.selectedPages as string[] | null;

      let urlsToScrape: string[] = [];
      if (selectedPages && selectedPages.length > 0) {
        urlsToScrape = selectedPages;
      } else if (serpResults && serpResults.length > 0) {
        // Default to top 5 results
        urlsToScrape = serpResults.slice(0, 5).map((r) => r.url);
      }

      if (urlsToScrape.length === 0) {
        throw new Error("No pages to scrape for context");
      }

      // Scrape pages in parallel
      console.log(`Scraping ${urlsToScrape.length} pages...`);
      const scrapeResults = await Promise.all(
        urlsToScrape.map((url) => scrapeWithFirecrawl(url))
      );

      // Filter out failed scrapes
      const scrapedPages = scrapeResults.filter(
        (result): result is ScrapedPage => result !== null
      );

      if (scrapedPages.length === 0) {
        throw new Error("Failed to scrape any pages");
      }

      console.log(
        `Successfully scraped ${scrapedPages.length}/${urlsToScrape.length} pages`
      );

      // Generate the article
      console.log(`Generating article with template: ${project.template}...`);
      const generatedContent = await generateArticle(
        project.keyword,
        project.title,
        project.template,
        scrapedPages
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

