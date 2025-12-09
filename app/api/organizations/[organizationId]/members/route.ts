import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { organization, organizationMember, user } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ organizationId: string }>;

// Helper to check if user has admin access to organization
async function checkAdminAccess(organizationId: string, userId: string) {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  if (!org) return { org: null, hasAccess: false };

  // Check if user is creator
  if (org.userId === userId) return { org, hasAccess: true };

  // Check if user is a member with owner/admin role
  const membership = await db.query.organizationMember.findFirst({
    where: and(
      eq(organizationMember.organizationId, organizationId),
      eq(organizationMember.userId, userId)
    ),
  });

  const hasAdminAccess =
    membership && (membership.role === "owner" || membership.role === "admin");

  return { org, hasAccess: !!hasAdminAccess };
}

// GET /api/organizations/[organizationId]/members - List all members
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

    // Check if user has access to this organization
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

    // Must be creator or member to view members
    if (org.userId !== session.user.id && !membership) {
      return NextResponse.json(
        { error: "You don't have access to this organization" },
        { status: 403 }
      );
    }

    const members = await db.query.organizationMember.findMany({
      where: eq(organizationMember.organizationId, organizationId),
      with: {
        user: true,
      },
      orderBy: (member, { asc }) => [asc(member.createdAt)],
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[organizationId]/members - Invite a new member
export async function POST(
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

    const { org, hasAccess } = await checkAdminAccess(
      organizationId,
      session.user.id
    );

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to invite members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = "member" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate role
    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Find user by email
    const invitedUser = await db.query.user.findFirst({
      where: eq(user.email, email.toLowerCase()),
    });

    if (!invitedUser) {
      return NextResponse.json(
        { error: "User not found. They must create an account first." },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await db.query.organizationMember.findFirst({
      where: and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, invitedUser.id)
      ),
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    const memberId = generateId();
    const [newMember] = await db
      .insert(organizationMember)
      .values({
        id: memberId,
        organizationId,
        userId: invitedUser.id,
        role: role as "owner" | "admin" | "member",
      })
      .returning();

    // Fetch with user details
    const memberWithUser = await db.query.organizationMember.findFirst({
      where: eq(organizationMember.id, newMember.id),
      with: {
        user: true,
      },
    });

    return NextResponse.json({ member: memberWithUser }, { status: 201 });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[organizationId]/members - Update a member's role
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

    const { org, hasAccess } = await checkAdminAccess(
      organizationId,
      session.user.id
    );

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have permission to update members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { error: "Member ID and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const [updated] = await db
      .update(organizationMember)
      .set({ role: role as "owner" | "admin" | "member" })
      .where(
        and(
          eq(organizationMember.id, memberId),
          eq(organizationMember.organizationId, organizationId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[organizationId]/members - Remove a member
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

    const { org, hasAccess } = await checkAdminAccess(
      organizationId,
      session.user.id
    );

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Get the member to check if they're the owner
    const member = await db.query.organizationMember.findFirst({
      where: and(
        eq(organizationMember.id, memberId),
        eq(organizationMember.organizationId, organizationId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't remove if they're the only owner
    if (member.role === "owner") {
      const ownerCount = await db.query.organizationMember.findMany({
        where: and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.role, "owner")
        ),
      });

      if (ownerCount.length <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the only owner. Transfer ownership first." },
          { status: 400 }
        );
      }
    }

    // Non-admins can only remove themselves
    if (!hasAccess && member.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only remove yourself from this organization" },
        { status: 403 }
      );
    }

    await db
      .delete(organizationMember)
      .where(
        and(
          eq(organizationMember.id, memberId),
          eq(organizationMember.organizationId, organizationId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
