import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import {
  domain,
  promptRun,
  mentionAnalysis,
  brandMention,
  prompt,
  topic,
} from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

// GET /api/organizations/:organizationId/domains/:domainId/topic-visibility
// Returns visibility metrics grouped by topic
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

    // Default to last 7 days if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    if (endDateStr) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

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

    // Get all topics for this domain
    const topics = await db.query.topic.findMany({
      where: eq(topic.domainId, domainId),
    });

    if (topics.length === 0) {
      return NextResponse.json({ topics: [] });
    }

    // Get all prompts for this domain with their topic assignments
    const prompts = await db.query.prompt.findMany({
      where: eq(prompt.domainId, domainId),
    });

    const promptIds = prompts.map((p) => p.id);

    if (promptIds.length === 0) {
      return NextResponse.json({
        topics: topics.map((t) => ({
          topicId: t.id,
          visibilityScore: 0,
          citationShare: 0,
          totalRuns: 0,
          mentionedRuns: 0,
        })),
      });
    }

    // Get prompt runs within date range
    const runs = await db.query.promptRun.findMany({
      where: and(
        inArray(promptRun.promptId, promptIds),
        gte(promptRun.executedAt, startDate),
        lte(promptRun.executedAt, endDate)
      ),
    });

    if (runs.length === 0) {
      return NextResponse.json({
        topics: topics.map((t) => ({
          topicId: t.id,
          visibilityScore: 0,
          citationShare: 0,
          totalRuns: 0,
          mentionedRuns: 0,
        })),
      });
    }

    const promptRunIds = runs.map((r) => r.id);

    // Get mention analyses for the user's domain
    const mentions = await db.query.mentionAnalysis.findMany({
      where: and(
        inArray(mentionAnalysis.promptRunId, promptRunIds),
        eq(mentionAnalysis.domainId, domainId)
      ),
    });

    // Get brand mentions for citation calculation
    const brandMentions = await db.query.brandMention.findMany({
      where: inArray(brandMention.promptRunId, promptRunIds),
    });

    // Get user's brand name variants for matching
    const userBrandName = (
      domainRecord.name || domainRecord.domain
    ).toLowerCase();
    const domainPartsForBrand = domainRecord.domain
      .toLowerCase()
      .replace(/^www\./, "")
      .split(".");
    const userDomainBase =
      domainPartsForBrand.length > 2
        ? domainPartsForBrand[domainPartsForBrand.length - 2]
        : domainPartsForBrand[0];

    // Find brand mentions that match the user's brand
    const userBrandMentions = brandMentions.filter((bm) => {
      const bmNameLower = bm.brandName.toLowerCase();
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

    // Create a map of promptRunId -> mentioned (from Groq)
    const groqMentionedRunIds = new Set(
      userBrandMentions.map((bm) => bm.promptRunId)
    );

    // Create a map of promptId -> topicId
    const promptTopicMap = prompts.reduce((acc, p) => {
      if (p.topicId) {
        acc[p.id] = p.topicId;
      }
      return acc;
    }, {} as Record<string, string>);

    // Create a map of promptRunId -> promptId
    const runPromptMap = runs.reduce((acc, r) => {
      acc[r.id] = r.promptId;
      return acc;
    }, {} as Record<string, string>);

    // Create a map of promptRunId -> mentioned (from mentionAnalysis)
    const mentionMap = mentions.reduce((acc, m) => {
      acc[m.promptRunId] = m.mentioned;
      return acc;
    }, {} as Record<string, boolean>);

    // Calculate visibility per topic
    const topicStats: Record<
      string,
      {
        totalRuns: number;
        mentionedRuns: number;
        totalBrandMentions: number;
        userBrandMentions: number;
      }
    > = {};

    // Initialize stats for all topics
    for (const t of topics) {
      topicStats[t.id] = {
        totalRuns: 0,
        mentionedRuns: 0,
        totalBrandMentions: 0,
        userBrandMentions: 0,
      };
    }

    // Count runs per topic
    for (const run of runs) {
      const promptId = runPromptMap[run.id];
      const topicId = promptTopicMap[promptId];

      if (topicId && topicStats[topicId]) {
        topicStats[topicId].totalRuns++;

        // Check if mentioned (use Groq or mentionAnalysis)
        const isMentioned =
          groqMentionedRunIds.has(run.id) || mentionMap[run.id];
        if (isMentioned) {
          topicStats[topicId].mentionedRuns++;
        }
      }
    }

    // Count brand mentions per topic for citation share
    for (const bm of brandMentions) {
      const promptId = runPromptMap[bm.promptRunId];
      const topicId = promptTopicMap[promptId];

      if (topicId && topicStats[topicId]) {
        topicStats[topicId].totalBrandMentions++;

        // Check if this is user's brand
        const bmNameLower = bm.brandName.toLowerCase();
        const bmDomainParts =
          bm.brandDomain
            ?.toLowerCase()
            .replace(/^www\./, "")
            .split(".") || [];
        const bmDomainLower =
          bmDomainParts.length > 2
            ? bmDomainParts[bmDomainParts.length - 2]
            : bmDomainParts[0] || "";

        if (
          bmNameLower === userBrandName ||
          bmNameLower === userDomainBase ||
          bmDomainLower === userDomainBase
        ) {
          topicStats[topicId].userBrandMentions++;
        }
      }
    }

    // Build response
    const topicVisibility = topics.map((t) => {
      const stats = topicStats[t.id];
      const visibilityScore =
        stats.totalRuns > 0
          ? Math.round((stats.mentionedRuns / stats.totalRuns) * 1000) / 10
          : 0;
      const citationShare =
        stats.totalBrandMentions > 0
          ? Math.round(
              (stats.userBrandMentions / stats.totalBrandMentions) * 1000
            ) / 10
          : 0;

      return {
        topicId: t.id,
        visibilityScore,
        citationShare,
        totalRuns: stats.totalRuns,
        mentionedRuns: stats.mentionedRuns,
      };
    });

    return NextResponse.json({ topics: topicVisibility });
  } catch (error) {
    console.error("Error fetching topic visibility:", error);
    return NextResponse.json(
      { error: "Failed to fetch topic visibility" },
      { status: 500 }
    );
  }
}
