import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, promptRun, brandMention, prompt } from "@/db/schema";
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

interface SourceDomain {
  domain: string;
  count: number;
  frequency: number;
}

// Helper to extract domain from URL
function extractDomain(url: string): string | null {
  try {
    // Handle URLs that might not have a protocol
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    // Try to extract domain from malformed URLs
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
    return match ? match[1].replace(/^www\./, "") : null;
  }
}

// Source domains data fetcher
async function getSourceDomainsData(
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
    return {
      sourceDomains: [],
      totalSources: 0,
      totalCitations: 0,
    };
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
    return {
      sourceDomains: [],
      totalSources: 0,
      totalCitations: 0,
    };
  }

  // Get brand mentions with citation URLs
  const brandMentions = await db.query.brandMention.findMany({
    where: inArray(brandMention.promptRunId, promptRunIds),
  });

  // Extract and count domains from citation URLs
  const domainCounts: Record<string, number> = {};
  let totalCitations = 0;

  for (const mention of brandMentions) {
    if (mention.citationUrl) {
      const extractedDomain = extractDomain(mention.citationUrl);
      if (extractedDomain) {
        domainCounts[extractedDomain] =
          (domainCounts[extractedDomain] || 0) + 1;
        totalCitations++;
      }
    }
  }

  // Convert to array and calculate frequency percentages
  const sourceDomains: SourceDomain[] = Object.entries(domainCounts)
    .map(([domainName, count]) => ({
      domain: domainName,
      count,
      frequency: totalCitations > 0 ? (count / totalCitations) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    sourceDomains,
    totalSources: sourceDomains.length,
    totalCitations,
  };
}

// GET /api/organizations/:organizationId/domains/:domainId/source-domains
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
    const data = await getSourceDomainsData(
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
    console.error("Error fetching source domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch source domains" },
      { status: 500 }
    );
  }
}
