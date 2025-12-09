import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import {
  domain,
  promptRun,
  mentionAnalysis,
  brandMention,
  prompt,
} from "@/db/schema";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    workspaceId: string;
    domainId: string;
  }>;
}

// GET /api/workspaces/:workspaceId/domains/:domainId/visibility
// Query params: startDate, endDate, platforms[], brands[]
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
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const platformsParam = searchParams.get("platforms");
    const brandsParam = searchParams.get("brands");

    // Default to last 7 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    // If endDate was provided as a date string, set to end of day (23:59:59.999 UTC)
    // to include all runs from that date
    if (endDateStr) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const platforms = platformsParam ? platformsParam.split(",") : null;
    const selectedBrands = brandsParam ? brandsParam.split(",") : null;

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

    // Get all prompt runs for this domain within the date range
    const prompts = await db.query.prompt.findMany({
      where: eq(prompt.domainId, domainId),
    });
    const promptIds = prompts.map((p) => p.id);

    if (promptIds.length === 0) {
      return NextResponse.json({
        visibilityScore: 0,
        chartData: [],
        industryRanking: [],
        totalPrompts: 0,
        totalMentions: 0,
      });
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
      return NextResponse.json({
        visibilityScore: 0,
        chartData: [],
        industryRanking: [],
        totalPrompts: 0,
        totalMentions: 0,
      });
    }

    // Get mention analyses for the user's domain
    const mentions = await db.query.mentionAnalysis.findMany({
      where: and(
        inArray(mentionAnalysis.promptRunId, promptRunIds),
        eq(mentionAnalysis.domainId, domainId)
      ),
    });

    // Calculate overall visibility score
    const totalRuns = runs.length;
    const mentionedRuns = mentions.filter((m) => m.mentioned).length;
    const visibilityScore =
      totalRuns > 0 ? Math.round((mentionedRuns / totalRuns) * 1000) / 10 : 0;

    // Calculate chart data (daily visibility scores)
    const dailyData: Record<string, { total: number; mentioned: number }> = {};

    for (const run of runs) {
      const dateKey = run.executedAt.toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { total: 0, mentioned: 0 };
      }
      dailyData[dateKey].total++;
    }

    for (const mention of mentions) {
      const run = runs.find((r) => r.id === mention.promptRunId);
      if (run && mention.mentioned) {
        const dateKey = run.executedAt.toISOString().split("T")[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].mentioned++;
        }
      }
    }

    const chartData = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        visibility:
          data.total > 0
            ? Math.round((data.mentioned / data.total) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get brand mentions for industry ranking
    let brandMentions = await db.query.brandMention.findMany({
      where: inArray(brandMention.promptRunId, promptRunIds),
    });

    // Filter by selected brands if specified
    if (selectedBrands && selectedBrands.length > 0) {
      brandMentions = brandMentions.filter((b) =>
        selectedBrands.some((sb) =>
          b.brandName.toLowerCase().includes(sb.toLowerCase())
        )
      );
    }

    // Aggregate brand data
    const brandAggregates: Record<
      string,
      {
        name: string;
        mentionCount: number;
        positions: number[];
        promptRunIds: Set<string>;
      }
    > = {};

    for (const bm of brandMentions) {
      const key = bm.brandName.toLowerCase();
      if (!brandAggregates[key]) {
        brandAggregates[key] = {
          name: bm.brandName,
          mentionCount: 0,
          positions: [],
          promptRunIds: new Set(),
        };
      }
      brandAggregates[key].mentionCount++;
      if (bm.position) {
        brandAggregates[key].positions.push(bm.position);
      }
      brandAggregates[key].promptRunIds.add(bm.promptRunId);
    }

    // Also add the user's domain to the ranking
    const userDomainKey = domainRecord.domain
      .toLowerCase()
      .replace(/^www\./, "");
    const domainName = domainRecord.name || domainRecord.domain;
    brandAggregates[userDomainKey] = {
      name: domainName,
      mentionCount: mentionedRuns,
      positions: mentions
        .filter((m) => m.mentioned && m.position)
        .map((m) => m.position!),
      promptRunIds: new Set(
        mentions.filter((m) => m.mentioned).map((m) => m.promptRunId)
      ),
    };

    // Calculate industry ranking
    const industryRanking = Object.values(brandAggregates)
      .map((brand) => {
        const avgPosition =
          brand.positions.length > 0
            ? Math.round(
                (brand.positions.reduce((a, b) => a + b, 0) /
                  brand.positions.length) *
                  10
              ) / 10
            : null;
        const visibility =
          totalRuns > 0
            ? Math.round((brand.promptRunIds.size / totalRuns) * 1000) / 10
            : 0;

        return {
          brand: brand.name,
          mentions: brand.mentionCount,
          position: avgPosition,
          change: 0, // TODO: Calculate vs previous period
          visibility,
          isUserDomain: brand.name === domainName,
        };
      })
      .sort((a, b) => b.visibility - a.visibility)
      .slice(0, 20) // Top 20 brands
      .map((brand, index) => ({
        ...brand,
        rank: index + 1,
      }));

    return NextResponse.json({
      visibilityScore,
      chartData,
      industryRanking,
      totalPrompts: totalRuns,
      totalMentions: mentionedRuns,
    });
  } catch (error) {
    console.error("Error fetching visibility data:", error);
    return NextResponse.json(
      { error: "Failed to fetch visibility data" },
      { status: 500 }
    );
  }
}
