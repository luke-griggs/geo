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

    // Get brand mentions for industry ranking (fetch early to use for visibility calculation)
    let brandMentions = await db.query.brandMention.findMany({
      where: inArray(brandMention.promptRunId, promptRunIds),
    });

    // Get the user's brand name variants for matching
    const userBrandName = (
      domainRecord.name || domainRecord.domain
    ).toLowerCase();
    // Extract the main domain name (handles subdomains like "shop.fairlife.com" -> "fairlife")
    const domainPartsForBrand = domainRecord.domain
      .toLowerCase()
      .replace(/^www\./, "")
      .split(".");
    const userDomainBase =
      domainPartsForBrand.length > 2
        ? domainPartsForBrand[domainPartsForBrand.length - 2]
        : domainPartsForBrand[0];

    // Find brand mentions that match the user's brand (Groq extraction)
    const userBrandMentions = brandMentions.filter((bm) => {
      const bmNameLower = bm.brandName.toLowerCase();
      // Extract base domain from brand mention (handles subdomains like "shop.fairlife.com" -> "fairlife")
      const bmDomainParts =
        bm.brandDomain
          ?.toLowerCase()
          .replace(/^www\./, "")
          .split(".") || [];
      const bmDomainLower =
        bmDomainParts.length > 2
          ? bmDomainParts[bmDomainParts.length - 2]
          : bmDomainParts[0] || "";
      return (
        bmNameLower === userBrandName ||
        bmNameLower === userDomainBase ||
        bmDomainLower === userDomainBase
      );
    });

    // Get unique prompt run IDs where user's brand was mentioned (from Groq)
    const groqMentionedRunIds = new Set(
      userBrandMentions.map((bm) => bm.promptRunId)
    );

    // Calculate overall visibility score
    // Use the better of: mentionAnalysis OR Groq brand extraction
    const totalRuns = runs.length;
    const mentionedRunsFromAnalysis = mentions.filter(
      (m) => m.mentioned
    ).length;
    const mentionedRunsFromGroq = groqMentionedRunIds.size;

    // Use Groq data if it found more mentions (Groq is more accurate)
    const mentionedRuns = Math.max(
      mentionedRunsFromAnalysis,
      mentionedRunsFromGroq
    );
    const visibilityScore =
      totalRuns > 0 ? Math.round((mentionedRuns / totalRuns) * 1000) / 10 : 0;

    // Calculate chart data (daily visibility scores)
    // Merge data from both mentionAnalysis and Groq extraction
    const dailyData: Record<
      string,
      { total: number; mentioned: number; mentionedRunIds: Set<string> }
    > = {};

    for (const run of runs) {
      const dateKey = run.executedAt.toISOString().split("T")[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          total: 0,
          mentioned: 0,
          mentionedRunIds: new Set(),
        };
      }
      dailyData[dateKey].total++;
    }

    // Add mentions from mentionAnalysis
    for (const mention of mentions) {
      const run = runs.find((r) => r.id === mention.promptRunId);
      if (run && mention.mentioned) {
        const dateKey = run.executedAt.toISOString().split("T")[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].mentionedRunIds.add(run.id);
        }
      }
    }

    // Add mentions from Groq extraction
    for (const runId of groqMentionedRunIds) {
      const run = runs.find((r) => r.id === runId);
      if (run) {
        const dateKey = run.executedAt.toISOString().split("T")[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].mentionedRunIds.add(run.id);
        }
      }
    }

    // Calculate final mentioned counts
    for (const dateKey of Object.keys(dailyData)) {
      dailyData[dateKey].mentioned = dailyData[dateKey].mentionedRunIds.size;
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

    // Get the user's brand name and domain variants for matching
    const domainName = domainRecord.name || domainRecord.domain;
    const userDomainKey = domainRecord.domain
      .toLowerCase()
      .replace(/^www\./, "");

    // Extract the base name from the domain (e.g., "fairlife" from "fairlife.com" or "shop.fairlife.com")
    const domainKeyParts = userDomainKey.split(".");
    const domainBaseName = (
      domainKeyParts.length > 2
        ? domainKeyParts[domainKeyParts.length - 2]
        : domainKeyParts[0]
    ).toLowerCase();
    const brandNameLower = domainName.toLowerCase();

    // Check if any Groq-extracted brand matches the user's brand
    // If so, merge the data (use Groq's mention count instead of mentionAnalysis)
    const matchingBrandKey = Object.keys(brandAggregates).find(
      (key) =>
        key === brandNameLower ||
        key === domainBaseName ||
        brandAggregates[key].name.toLowerCase() === brandNameLower ||
        brandAggregates[key].name.toLowerCase() === domainBaseName
    );

    if (matchingBrandKey) {
      // Found a matching brand from Groq - mark it as user's domain
      // Keep the Groq data but update the key to be consistent
      const existingData = brandAggregates[matchingBrandKey];
      delete brandAggregates[matchingBrandKey];
      brandAggregates[userDomainKey] = {
        ...existingData,
        name: domainName, // Use the user's preferred brand name
      };
    } else {
      // No matching brand found from Groq - add user's domain with mentionAnalysis data
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
    }

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

        // Case-insensitive comparison for isUserDomain
        const isUserDomain =
          brand.name.toLowerCase() === brandNameLower ||
          brand.name.toLowerCase() === domainBaseName;

        return {
          brand: brand.name,
          mentions: brand.mentionCount,
          position: avgPosition,
          change: 0, // TODO: Calculate vs previous period
          visibility,
          isUserDomain,
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
