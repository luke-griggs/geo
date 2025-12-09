import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization, organizationMember } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ organizationId: string }>;

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

// GET /api/organizations/[organizationId]/domains - List all domains
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

    const domains = await db.query.domain.findMany({
      where: eq(domain.workspaceId, organizationId),
      with: {
        prompts: true,
      },
      orderBy: (domain, { desc }) => [desc(domain.createdAt)],
    });

    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[organizationId]/domains - Create a new domain
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

    const org = await checkOrgAccess(organizationId, session.user.id);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { domain: domainName, name } = body;

    if (!domainName || typeof domainName !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Clean the domain (remove protocol, trailing slashes, etc.)
    const cleanedDomain = domainName
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .trim();

    const id = generateId();

    const [newDomain] = await db
      .insert(domain)
      .values({
        id,
        domain: cleanedDomain,
        name: name || cleanedDomain,
        workspaceId: organizationId,
      })
      .returning();

    return NextResponse.json({ domain: newDomain }, { status: 201 });
  } catch (error) {
    console.error("Error creating domain:", error);
    return NextResponse.json(
      { error: "Failed to create domain" },
      { status: 500 }
    );
  }
}

