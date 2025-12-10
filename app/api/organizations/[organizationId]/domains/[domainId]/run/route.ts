import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runPromptsForDomain } from "@/lib/prompt-runner";

type Params = Promise<{ organizationId: string; domainId: string }>;

// POST /api/organizations/[organizationId]/domains/[domainId]/run - Manually run all prompts for a domain
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { organizationId, domainId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organization ownership
    const orgExists = await db.query.organization.findFirst({
      where: and(
        eq(organization.id, organizationId),
        eq(organization.userId, userId)
      ),
    });

    if (!orgExists) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Verify domain belongs to organization
    const domainExists = await db.query.domain.findFirst({
      where: and(
        eq(domain.id, domainId),
        eq(domain.workspaceId, organizationId)
      ),
    });

    if (!domainExists) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Get provider from body or default to chatgpt
    const body = await request.json().catch(() => ({}));
    const provider = body.provider || "chatgpt";

    // Run the prompts
    const results = await runPromptsForDomain(domainId, provider);

    // Calculate summary
    const summary = {
      totalPrompts: results.length,
      successfulRuns: results.filter((r) => r.success).length,
      failedRuns: results.filter((r) => !r.success).length,
      mentions: results.filter((r) => r.mentioned).length,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error("Error running prompts:", error);
    return NextResponse.json(
      {
        error: "Failed to run prompts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
