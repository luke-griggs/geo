import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

interface BraveSearchResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

interface BraveWebResult {
  url: string;
  title: string;
  description: string;
}

interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[];
  };
}

// POST /api/organizations/:organizationId/domains/:domainId/keywords/search
// Fetches top-ranking pages from Brave Search API for a given keyword
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId } = await params;
    const body = await request.json();
    const { keyword } = body;

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

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

    // Call Brave Search API
    const braveApiKey = process.env.BRAVE_API_KEY;
    if (!braveApiKey) {
      return NextResponse.json(
        { error: "Brave Search API not configured" },
        { status: 500 }
      );
    }

    const searchUrl = new URL("https://api.search.brave.com/res/v1/web/search");
    searchUrl.searchParams.set("q", keyword);
    searchUrl.searchParams.set("count", "10"); // Top 10 results

    const braveResponse = await fetch(searchUrl.toString(), {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": braveApiKey,
      },
    });

    if (!braveResponse.ok) {
      const errorText = await braveResponse.text();
      console.error("Brave Search API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch search results" },
        { status: 500 }
      );
    }

    const braveData: BraveSearchResponse = await braveResponse.json();

    // Transform results to our format
    const results: BraveSearchResult[] =
      braveData.web?.results.map((result, index) => ({
        url: result.url,
        title: result.title,
        snippet: result.description,
        position: index + 1,
      })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching keywords:", error);
    return NextResponse.json(
      { error: "Failed to search keywords" },
      { status: 500 }
    );
  }
}
