import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import {
  domain,
  prompt,
  promptRun,
  mentionAnalysis,
  brandMention,
  workspace,
} from "@/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    workspaceId: string;
    domainId: string;
  }>;
}

// GET /api/workspaces/:workspaceId/domains/:domainId/queries
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

    const { workspaceId, domainId } = await params;
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

    // Verify workspace ownership
    const workspaceRecord = await db.query.workspace.findFirst({
      where: and(
        eq(workspace.id, workspaceId),
        eq(workspace.userId, session.user.id)
      ),
    });

    if (!workspaceRecord) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Verify domain belongs to workspace
    const domainRecord = await db.query.domain.findFirst({
      where: and(eq(domain.id, domainId), eq(domain.workspaceId, workspaceId)),
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

      // Get citations from brand mentions
      const citations = run.brandMentions
        .filter((b) => b.citationUrl)
        .map((b) => ({
          brandName: b.brandName,
          url: b.citationUrl,
          domain: b.brandDomain,
        }));

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
