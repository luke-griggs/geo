import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import {
  domain,
  prompt,
  promptRun,
  mentionAnalysis,
  brandMention,
  organization,
} from "@/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

// GET /api/organizations/:organizationId/domains/:domainId/queries
// Returns all prompt runs (queries) with their mentions, brand mentions, etc.
// Query params: startDate, endDate, platforms[], mentionsOnly (boolean)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const platformsParam = searchParams.get("platforms");
    const mentionsOnly = searchParams.get("mentionsOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Default to last 7 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    if (endDateStr) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const platforms = platformsParam ? platformsParam.split(",") : null;

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

    // Get all prompts for this domain
    const prompts = await db.query.prompt.findMany({
      where: eq(prompt.domainId, domainId),
    });
    const promptIds = prompts.map((p) => p.id);
    const promptMap = new Map(prompts.map((p) => [p.id, p]));

    if (promptIds.length === 0) {
      return NextResponse.json({
        queries: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // Get prompt runs within date range
    let runs = await db.query.promptRun.findMany({
      where: and(
        inArray(promptRun.promptId, promptIds),
        gte(promptRun.executedAt, startDate),
        lte(promptRun.executedAt, endDate)
      ),
      orderBy: [desc(promptRun.executedAt)],
      with: {
        mentionAnalyses: true,
        brandMentions: true,
      },
    });

    // Filter by platform if specified
    if (platforms && platforms.length > 0) {
      runs = runs.filter((r) => platforms.includes(r.llmProvider));
    }

    // Get mention analyses for filtering
    const runIds = runs.map((r) => r.id);
    const domainMentions = await db.query.mentionAnalysis.findMany({
      where: and(
        inArray(mentionAnalysis.promptRunId, runIds),
        eq(mentionAnalysis.domainId, domainId)
      ),
    });
    const mentionByRunId = new Map(
      domainMentions.map((m) => [m.promptRunId, m])
    );

    // Filter to mentions only if requested
    if (mentionsOnly) {
      runs = runs.filter((r) => {
        const mention = mentionByRunId.get(r.id);
        return mention?.mentioned;
      });
    }

    // Calculate total before pagination
    const total = runs.length;
    const totalPages = Math.ceil(total / limit);

    // Calculate aggregate stats from ALL runs (before pagination)
    // Count citations that reference the user's domain (branded citations)
    // Not ALL citations from web search, only ones that cite the user's website
    const userDomainName = domainRecord.domain
      .toLowerCase()
      .replace("www.", "");

    const totalCitations = runs.reduce((acc, r) => {
      const citations = r.citations as
        | Array<{ url: string; title: string; snippet?: string }>
        | null
        | undefined;
      if (!citations) return acc;

      // Only count citations that reference the user's domain
      const brandedCitations = citations.filter((c) => {
        try {
          if (!c.url) return false;
          const citationDomain = new URL(c.url).hostname
            .toLowerCase()
            .replace("www.", "");
          return (
            citationDomain === userDomainName ||
            citationDomain.endsWith(`.${userDomainName}`)
          );
        } catch {
          return false;
        }
      });
      return acc + brandedCitations.length;
    }, 0);

    const aggregateStats = {
      totalMentions: runs.filter((r) => mentionByRunId.get(r.id)?.mentioned)
        .length,
      totalCitations,
      totalQueries: runs.length,
      // Group by date for chart - track both mentions and branded citations
      chartData: Object.entries(
        runs.reduce((acc, r) => {
          const date = r.executedAt.toISOString().split("T")[0];
          if (!acc[date]) acc[date] = { mentions: 0, citations: 0 };
          if (mentionByRunId.get(r.id)?.mentioned) acc[date].mentions++;

          // Only count citations that reference the user's domain
          const citations = r.citations as
            | Array<{ url: string; title: string; snippet?: string }>
            | null
            | undefined;
          if (citations) {
            const brandedCitations = citations.filter((c) => {
              try {
                if (!c.url) return false;
                const citationDomain = new URL(c.url).hostname
                  .toLowerCase()
                  .replace("www.", "");
                return (
                  citationDomain === userDomainName ||
                  citationDomain.endsWith(`.${userDomainName}`)
                );
              } catch {
                return false;
              }
            });
            acc[date].citations += brandedCitations.length;
          }
          return acc;
        }, {} as Record<string, { mentions: number; citations: number }>)
      )
        .map(([date, data]) => ({
          date,
          mentions: data.mentions,
          citations: data.citations,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      // Platform breakdown
      platformData: Object.entries(
        runs.reduce((acc, r) => {
          if (!acc[r.llmProvider])
            acc[r.llmProvider] = { total: 0, mentions: 0 };
          acc[r.llmProvider].total++;
          if (mentionByRunId.get(r.id)?.mentioned) {
            acc[r.llmProvider].mentions++;
          }
          return acc;
        }, {} as Record<string, { total: number; mentions: number }>)
      ).map(([name, data]) => ({
        name,
        mentions: data.mentions,
        percentage:
          data.total > 0 ? Math.round((data.mentions / data.total) * 100) : 0,
      })),
    };

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedRuns = runs.slice(offset, offset + limit);

    // Transform data for the frontend
    const queries = paginatedRuns.map((run) => {
      const promptData = promptMap.get(run.promptId);
      const domainMention = mentionByRunId.get(run.id);

      // Calculate mention count (how many times mentioned across analyses)
      const mentionCount = domainMention?.mentioned ? 1 : 0;

      // Get average position from brand mentions
      const mentionedBrands = run.brandMentions.filter((b) => b.mentioned);
      const positions = mentionedBrands
        .map((b) => b.position)
        .filter((p): p is number => p !== null);
      const avgPosition =
        positions.length > 0
          ? Math.round(
              (positions.reduce((a, b) => a + b, 0) / positions.length) * 10
            ) / 10
          : null;

      // Parse sentiment
      const sentiment = domainMention?.sentimentScore
        ? parseFloat(domainMention.sentimentScore)
        : null;

      // Get citations - prefer url_citations from the LLM response, fallback to brand mentions
      const urlCitations =
        (
          run.citations as
            | Array<{ url: string; title: string; snippet?: string }>
            | null
            | undefined
        )?.map((c) => {
          // Extract domain from URL
          let extractedDomain: string | null = null;
          try {
            if (c.url) {
              const url = new URL(c.url);
              extractedDomain = url.hostname;
            }
          } catch {
            // Invalid URL, domain stays null
          }
          return {
            brandName: c.title || "",
            url: c.url,
            domain: extractedDomain,
            title: c.title,
            snippet: c.snippet,
          };
        }) || [];

      // Fallback to brand mention citations if no url_citations
      const brandCitations = run.brandMentions
        .filter((b) => b.citationUrl)
        .map((b) => ({
          brandName: b.brandName,
          url: b.citationUrl,
          domain: b.brandDomain,
          title: undefined,
          snippet: undefined,
        }));

      const citations = urlCitations.length > 0 ? urlCitations : brandCitations;

      return {
        id: run.id,
        promptId: run.promptId,
        query: promptData?.promptText || "",
        date: run.executedAt.toISOString(),
        source: run.llmProvider,
        location: promptData?.location
          ? {
              city: promptData.location,
              flag: "🌍", // Default flag, could be parsed from location
            }
          : null,
        mentioned: {
          count: mentionCount,
          total: 1, // Per run, there's one analysis for the user's domain
        },
        avgPosition,
        sentiment,
        citations,
        response: run.responseText,
        searchQueries: run.searchQueries as string[] | null, // queries the model passed to the web search tool
        brandMentions: run.brandMentions.map((b) => ({
          id: b.id,
          brandName: b.brandName,
          brandDomain: b.brandDomain,
          position: b.position,
          mentioned: b.mentioned,
        })),
        contextSnippet: domainMention?.contextSnippet || null,
        error: run.error,
      };
    });

    return NextResponse.json({
      queries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: aggregateStats,
      domainName: domainRecord.name || domainRecord.domain,
    });
  } catch (error) {
    console.error("Error fetching queries:", error);
    return NextResponse.json(
      { error: "Failed to fetch queries" },
      { status: 500 }
    );
  }
}
