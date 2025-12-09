import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { organization, organizationMember, domain } from "@/db/schema";
import { generateId, generateUniqueSlug } from "@/lib/id";
import { eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/organizations - List all organizations for the current user
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizations where user is the creator OR is a member
    const memberships = await db.query.organizationMember.findMany({
      where: eq(organizationMember.userId, session.user.id),
      with: {
        organization: {
          with: {
            domains: true,
            members: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Also get organizations created by the user (in case membership wasn't created)
    const createdOrgs = await db.query.organization.findMany({
      where: eq(organization.userId, session.user.id),
      with: {
        domains: true,
        members: {
          with: {
            user: true,
          },
        },
      },
    });

    // Merge and dedupe
    const orgMap = new Map<string, (typeof createdOrgs)[0]>();
    for (const org of createdOrgs) {
      orgMap.set(org.id, org);
    }
    for (const membership of memberships) {
      if (!orgMap.has(membership.organization.id)) {
        orgMap.set(membership.organization.id, membership.organization);
      }
    }

    const organizations = Array.from(orgMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization (and optionally a domain)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, domain: domainUrl } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const organizationId = generateId();
    const slug = generateUniqueSlug(name);

    // Create the organization
    const [newOrganization] = await db
      .insert(organization)
      .values({
        id: organizationId,
        name,
        slug,
        userId: session.user.id,
      })
      .returning();

    // Create owner membership
    const memberId = generateId();
    await db.insert(organizationMember).values({
      id: memberId,
      organizationId: organizationId,
      userId: session.user.id,
      role: "owner",
    });

    let newDomain = null;

    // If a domain was provided, create it
    if (domainUrl && typeof domainUrl === "string") {
      // Clean up the domain URL
      const cleanDomain = domainUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .toLowerCase();

      const domainId = generateId();

      [newDomain] = await db
        .insert(domain)
        .values({
          id: domainId,
          domain: cleanDomain,
          name: name, // Use organization name as domain friendly name
          workspaceId: organizationId, // Using workspaceId for backward compatibility
          verified: false,
        })
        .returning();
    }

    return NextResponse.json(
      {
        organization: newOrganization,
        domain: newDomain,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
