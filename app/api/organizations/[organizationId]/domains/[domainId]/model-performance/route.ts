import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, promptRun, mentionAnalysis, prompt } from "@/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { CACHE_HEADERS } from "@/lib/cache";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

// Model performance data fetcher
async function getModelPerformanceData(
  domainId: string,
  startDate: Date,
  endDate: Date,
  platforms: string[] | null
) {
  // Get all prompts for this domain
  const prompts = await db.query.prompt.findMany({
    where: eq(prompt.domainId, domainId),
  });
  const promptIds = prompts.map((p) => p.id);

  if (promptIds.length === 0) {
    return { models: [] };
  }

  // Build prompt run query conditions
  const promptRunConditions = and(
    inArray(promptRun.promptId, promptIds),
    gte(promptRun.executedAt, startDate),
    lte(promptRun.executedAt, endDate)
  );

  // Get prompt runs
  let runs = await db.query.promptRun.findMany({
    where: promptRunConditions,
    orderBy: [desc(promptRun.executedAt)],
  });

  // Filter by platform if specified
  if (platforms && platforms.length > 0) {
    runs = runs.filter((r) => platforms.includes(r.llmProvider));
  }

  const promptRunIds = runs.map((r) => r.id);

  if (promptRunIds.length === 0) {
    return { models: [] };
  }

  // Get mention analyses for the user's domain
  const mentions = await db.query.mentionAnalysis.findMany({
    where: and(
      inArray(mentionAnalysis.promptRunId, promptRunIds),
      eq(mentionAnalysis.domainId, domainId)
    ),
  });

  // Aggregate by provider/model
  const modelMap: Record<
    string,
    {
      totalRuns: number;
      mentionedRuns: number;
    }
  > = {};

  // Count runs per provider
  for (const run of runs) {
    const provider = run.llmProvider;
    if (!modelMap[provider]) {
      modelMap[provider] = {
        totalRuns: 0,
        mentionedRuns: 0,
      };
    }
    modelMap[provider].totalRuns++;
  }

  // Count mentions per provider
  for (const mention of mentions) {
    if (mention.mentioned) {
      const run = runs.find((r) => r.id === mention.promptRunId);
      if (run) {
        const provider = run.llmProvider;
        if (modelMap[provider]) {
          modelMap[provider].mentionedRuns++;
        }
      }
    }
  }

  // Calculate visibility rate per model
  const models = Object.entries(modelMap)
    .map(([provider, data]) => ({
      provider,
      visibilityRate:
        data.totalRuns > 0
          ? Math.round((data.mentionedRuns / data.totalRuns) * 1000) / 10
          : 0,
      totalRuns: data.totalRuns,
      mentionedRuns: data.mentionedRuns,
    }))
    .sort((a, b) => b.visibilityRate - a.visibilityRate);

  return { models };
}

// GET /api/organizations/:organizationId/domains/:domainId/model-performance
// Query params: startDate, endDate, platforms[]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domainId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const startDateStr = searchParams.get("startDate") || "";
    const endDateStr = searchParams.get("endDate") || "";
    const platformsParam = searchParams.get("platforms") || "";

    // Verify domain exists and belongs to user's organization
    const domainRecord = await db.query.domain.findFirst({
      where: eq(domain.id, domainId),
      with: {
        organization: true,
      },
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domainRecord.organization.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse dates
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    if (endDateStr) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const platforms = platformsParam ? platformsParam.split(",") : null;

    // Fetch data directly (React Query handles client-side caching)
    const data = await getModelPerformanceData(
      domainId,
      startDate,
      endDate,
      platforms
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": CACHE_HEADERS.dynamic,
      },
    });
  } catch (error) {
    console.error("Error fetching model performance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch model performance data" },
      { status: 500 }
    );
  }
}
