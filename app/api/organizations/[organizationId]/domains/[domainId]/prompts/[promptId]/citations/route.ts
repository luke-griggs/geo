import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { prompt, domain, organization, promptRun } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{
  organizationId: string;
  domainId: string;
  promptId: string;
}>;

interface Citation {
  url: string;
  title?: string;
  snippet?: string;
}

interface AggregatedCitation {
  url: string;
  title: string;
  snippet?: string;
  count: number;
  isEarned: boolean;
}

// Helper to verify ownership
async function verifyOwnership(
  organizationId: string,
  domainId: string,
  promptId: string,
  userId: string
) {
  const orgExists = await db.query.organization.findFirst({
    where: and(
      eq(organization.id, organizationId),
      eq(organization.userId, userId)
    ),
  });

  if (!orgExists) {
    return { error: "Organization not found", status: 404 };
  }

  const domainRecord = await db.query.domain.findFirst({
    where: and(eq(domain.id, domainId), eq(domain.workspaceId, organizationId)),
  });

  if (!domainRecord) {
    return { error: "Domain not found", status: 404 };
  }

  const promptExists = await db.query.prompt.findFirst({
    where: and(eq(prompt.id, promptId), eq(prompt.domainId, domainId)),
  });

  if (!promptExists) {
    return { error: "Prompt not found", status: 404 };
  }

  return { prompt: promptExists, domain: domainRecord };
}

// GET /api/organizations/[organizationId]/domains/[domainId]/prompts/[promptId]/citations
// Returns aggregated citations from all runs of a prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { organizationId, domainId, promptId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await verifyOwnership(
      organizationId,
      domainId,
      promptId,
      userId
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const domainUrl = result.domain.domain.toLowerCase().replace(/^www\./, "");

    // Get all runs for this prompt
    const runs = await db.query.promptRun.findMany({
      where: eq(promptRun.promptId, promptId),
    });

    // Aggregate citations from all runs
    const citationMap = new Map<
      string,
      { title: string; snippet?: string; count: number }
    >();

    for (const run of runs) {
      const citations = run.citations as Citation[] | null;
      if (!citations || citations.length === 0) continue;

      for (const citation of citations) {
        if (!citation.url) continue;

        const normalizedUrl = citation.url.toLowerCase().trim();
        const existing = citationMap.get(normalizedUrl);

        if (existing) {
          existing.count++;
          // Keep the first non-empty title and snippet we found
          if (!existing.title && citation.title) {
            existing.title = citation.title;
          }
          if (!existing.snippet && citation.snippet) {
            existing.snippet = citation.snippet;
          }
        } else {
          citationMap.set(normalizedUrl, {
            title: citation.title || citation.url,
            snippet: citation.snippet,
            count: 1,
          });
        }
      }
    }

    // Convert to array, check if earned (matches domain), and sort by count
    const aggregatedCitations: AggregatedCitation[] = Array.from(
      citationMap.entries()
    )
      .map(([url, data]) => {
        // Check if this citation is from the user's domain (earned)
        let isEarned = false;
        try {
          const citationHost = new URL(url).hostname
            .toLowerCase()
            .replace(/^www\./, "");
          isEarned =
            citationHost.includes(domainUrl) ||
            domainUrl.includes(citationHost);
        } catch {
          // If URL parsing fails, assume not earned
        }

        return {
          url,
          title: data.title,
          snippet: data.snippet,
          count: data.count,
          isEarned,
        };
      })
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      citations: aggregatedCitations,
      totalRuns: runs.length,
    });
  } catch (error) {
    console.error("Error fetching citations:", error);
    return NextResponse.json(
      { error: "Failed to fetch citations" },
      { status: 500 }
    );
  }
}
