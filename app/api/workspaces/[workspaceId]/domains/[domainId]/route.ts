import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization, organizationMember } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ workspaceId: string; domainId: string }>;

// Helper to check organization access
async function checkOrgAccess(organizationId: string, userId: string) {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  if (!org) return null;

  // Check if user is creator
  if (org.userId === userId) return org;

  // Check if user is a member
  const membership = await db.query.organizationMember.findFirst({
    where: and(
      eq(organizationMember.organizationId, organizationId),
      eq(organizationMember.userId, userId)
    ),
  });

  return membership ? org : null;
}

// Helper to verify ownership
async function verifyOwnership(
  workspaceId: string,
  domainId: string,
  userId: string
) {
  const org = await checkOrgAccess(workspaceId, userId);

  if (!org) {
    return { error: "Workspace not found", status: 404 };
  }

  const domainExists = await db.query.domain.findFirst({
    where: and(eq(domain.id, domainId), eq(domain.workspaceId, workspaceId)),
  });

  if (!domainExists) {
    return { error: "Domain not found", status: 404 };
  }

  return { domain: domainExists };
}

// GET /api/workspaces/[workspaceId]/domains/[domainId] - Get a single domain
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyOwnership(
      workspaceId,
      domainId,
      session.user.id
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const domainWithPrompts = await db.query.domain.findFirst({
      where: eq(domain.id, domainId),
      with: {
        prompts: {
          orderBy: (prompt, { desc }) => [desc(prompt.createdAt)],
        },
      },
    });

    return NextResponse.json({ domain: domainWithPrompts });
  } catch (error) {
    console.error("Error fetching domain:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain" },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[workspaceId]/domains/[domainId] - Update a domain
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyOwnership(
      workspaceId,
      domainId,
      session.user.id
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const body = await request.json();
    const { name, domain: domainName } = body;

    const updateData: { name?: string; domain?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (domainName !== undefined) {
      updateData.domain = domainName
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .trim();
    }

    const [updated] = await db
      .update(domain)
      .set(updateData)
      .where(eq(domain.id, domainId))
      .returning();

    return NextResponse.json({ domain: updated });
  } catch (error) {
    console.error("Error updating domain:", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/domains/[domainId] - Delete a domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyOwnership(
      workspaceId,
      domainId,
      session.user.id
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    await db.delete(domain).where(eq(domain.id, domainId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting domain:", error);
    return NextResponse.json(
      { error: "Failed to delete domain" },
      { status: 500 }
    );
  }
}
