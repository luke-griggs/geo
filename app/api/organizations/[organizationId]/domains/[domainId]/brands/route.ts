import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, promptRun, brandMention, prompt } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

// GET /api/organizations/:organizationId/domains/:domainId/brands
// Returns all detected brands for this domain
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domainId } = await params;

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

    // Get all prompts for this domain
    const prompts = await db.query.prompt.findMany({
      where: eq(prompt.domainId, domainId),
    });
    const promptIds = prompts.map((p) => p.id);

    if (promptIds.length === 0) {
      return NextResponse.json({ brands: [] });
    }

    // Get all prompt runs for these prompts
    const runs = await db.query.promptRun.findMany({
      where: inArray(promptRun.promptId, promptIds),
      orderBy: [desc(promptRun.executedAt)],
    });
    const promptRunIds = runs.map((r) => r.id);

    if (promptRunIds.length === 0) {
      return NextResponse.json({ brands: [] });
    }

    // Get all brand mentions
    const allBrandMentions = await db.query.brandMention.findMany({
      where: inArray(brandMention.promptRunId, promptRunIds),
    });

    // Aggregate brand data
    const brandAggregates: Record<
      string,
      {
        name: string;
        domain: string | null;
        mentionCount: number;
        firstSeen: Date;
        lastSeen: Date;
      }
    > = {};

    for (const bm of allBrandMentions) {
      const key = bm.brandName.toLowerCase();
      const run = runs.find((r) => r.id === bm.promptRunId);

      if (!run) continue;

      if (!brandAggregates[key]) {
        brandAggregates[key] = {
          name: bm.brandName,
          domain: bm.brandDomain,
          mentionCount: 0,
          firstSeen: run.executedAt,
          lastSeen: run.executedAt,
        };
      }

      brandAggregates[key].mentionCount++;

      // Keep the most recent domain if we have one
      if (bm.brandDomain && !brandAggregates[key].domain) {
        brandAggregates[key].domain = bm.brandDomain;
      }

      if (run.executedAt < brandAggregates[key].firstSeen) {
        brandAggregates[key].firstSeen = run.executedAt;
      }
      if (run.executedAt > brandAggregates[key].lastSeen) {
        brandAggregates[key].lastSeen = run.executedAt;
      }
    }

    // Convert to array and sort by mention count
    const brands = Object.values(brandAggregates)
      .map((brand) => ({
        name: brand.name,
        domain: brand.domain,
        mentionCount: brand.mentionCount,
        firstSeen: brand.firstSeen.toISOString(),
        lastSeen: brand.lastSeen.toISOString(),
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount);

    return NextResponse.json({ brands });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
