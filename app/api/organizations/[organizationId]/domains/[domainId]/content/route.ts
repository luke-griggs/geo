import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization, contentProject } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateId } from "@/lib/id";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

// GET /api/organizations/:organizationId/domains/:domainId/content
// Lists all content projects for a domain
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

    // Get all content projects for this domain
    const projects = await db.query.contentProject.findMany({
      where: eq(contentProject.domainId, domainId),
      orderBy: [desc(contentProject.createdAt)],
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching content projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch content projects" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/:organizationId/domains/:domainId/content
// Creates a new content project
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
    const { keyword, title, template, serpResults, selectedPages } = body;

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

    // Create the content project
    const projectId = generateId();
    const [project] = await db
      .insert(contentProject)
      .values({
        id: projectId,
        domainId,
        keyword,
        title: title || null,
        template: template || null,
        status: "draft",
        serpResults: serpResults || null,
        selectedPages: selectedPages || null,
      })
      .returning();

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Error creating content project:", error);
    return NextResponse.json(
      { error: "Failed to create content project" },
      { status: 500 }
    );
  }
}

