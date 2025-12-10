import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ organizationId: string; domainId: string }>;

// GET /api/organizations/[organizationId]/domains/[domainId]/run-status - Get prompt run status and progress
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { domainId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get domain with organization to verify ownership
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

    return NextResponse.json({
      status: domainRecord.promptRunStatus || "pending",
      progress: domainRecord.promptRunProgress || 0,
      total: domainRecord.promptRunTotal || 0,
    });
  } catch (error) {
    console.error("Error getting run status:", error);
    return NextResponse.json(
      {
        error: "Failed to get run status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
