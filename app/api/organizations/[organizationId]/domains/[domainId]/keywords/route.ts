import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, prompt, promptRun, topic, organization } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

interface KeywordWithFrequency {
  text: string;
  frequency: number;
  topicName?: string;
}

// GET /api/organizations/:organizationId/domains/:domainId/keywords
// Aggregates and returns suggested keywords from promptRun.searchQueries
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId } = await params;

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

    // Get all prompts for this domain with their topics
    const prompts = await db.query.prompt.findMany({
      where: eq(prompt.domainId, domainId),
      with: {
        topic: true,
      },
    });

    const promptIds = prompts.map((p) => p.id);

    if (promptIds.length === 0) {
      return NextResponse.json({ keywords: [] });
    }

    // Create a map from promptId to topic name for later lookup
    const promptTopicMap = new Map<string, string | null>();
    for (const p of prompts) {
      promptTopicMap.set(p.id, p.topic?.name || null);
    }

    // Get all prompt runs for these prompts
    const runs = await db.query.promptRun.findMany({
      where: inArray(promptRun.promptId, promptIds),
    });

    // Aggregate search queries with frequency counts
    const keywordFrequency = new Map<
      string,
      { frequency: number; topicName: string | null }
    >();

    for (const run of runs) {
      const searchQueries = run.searchQueries as string[] | null;
      if (!searchQueries || searchQueries.length === 0) continue;

      const topicName = promptTopicMap.get(run.promptId) || null;

      for (const query of searchQueries) {
        // Normalize the query (lowercase, trim)
        const normalizedQuery = query.toLowerCase().trim();
        if (!normalizedQuery) continue;

        const existing = keywordFrequency.get(normalizedQuery);
        if (existing) {
          existing.frequency++;
          // Keep the first topic name we found
        } else {
          keywordFrequency.set(normalizedQuery, {
            frequency: 1,
            topicName,
          });
        }
      }
    }

    // Convert to array and sort by frequency (descending)
    const keywords: KeywordWithFrequency[] = Array.from(
      keywordFrequency.entries()
    )
      .map(([text, data]) => ({
        text,
        frequency: data.frequency,
        topicName: data.topicName || undefined,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("Error fetching keywords:", error);
    return NextResponse.json(
      { error: "Failed to fetch keywords" },
      { status: 500 }
    );
  }
}

