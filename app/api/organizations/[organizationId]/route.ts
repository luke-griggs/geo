import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { organization, organizationMember } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ organizationId: string }>;

// Helper to check if user has access to organization
async function checkOrgAccess(organizationId: string, userId: string) {
  // Check if user is creator or member
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

// GET /api/organizations/[organizationId] - Get a single organization
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { organizationId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await checkOrgAccess(organizationId, session.user.id);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get full organization with domains and members
    const result = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      with: {
        domains: {
          with: {
            prompts: true,
          },
        },
        members: {
          with: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({ organization: result });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[organizationId] - Update an organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { organizationId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/owner access
    const membership = await db.query.organizationMember.findFirst({
      where: and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, session.user.id)
      ),
    });

    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Must be creator or have owner/admin role
    const isCreator = org.userId === session.user.id;
    const hasAdminAccess =
      membership &&
      (membership.role === "owner" || membership.role === "admin");

    if (!isCreator && !hasAdminAccess) {
      return NextResponse.json(
        { error: "You don't have permission to update this organization" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, image } = body;

    const updateData: { name?: string; image?: string } = {};
    if (name) updateData.name = name;
    if (image !== undefined) updateData.image = image;

    const [updated] = await db
      .update(organization)
      .set(updateData)
      .where(eq(organization.id, organizationId))
      .returning();

    return NextResponse.json({ organization: updated });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[organizationId] - Delete an organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { organizationId } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only creator or owner can delete
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const membership = await db.query.organizationMember.findFirst({
      where: and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, session.user.id),
        eq(organizationMember.role, "owner")
      ),
    });

    if (org.userId !== session.user.id && !membership) {
      return NextResponse.json(
        { error: "Only the organization owner can delete it" },
        { status: 403 }
      );
    }

    await db.delete(organization).where(eq(organization.id, organizationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}

