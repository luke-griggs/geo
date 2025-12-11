import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization, contentProject } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
    projectId: string;
  }>;
}

// GET /api/organizations/:organizationId/domains/:domainId/content/:projectId
// Gets a single content project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId, projectId } = await params;

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

    // Get the content project
    const project = await db.query.contentProject.findFirst({
      where: and(
        eq(contentProject.id, projectId),
        eq(contentProject.domainId, domainId)
      ),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Content project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error fetching content project:", error);
    return NextResponse.json(
      { error: "Failed to fetch content project" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/:organizationId/domains/:domainId/content/:projectId
// Updates a content project
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId, projectId } = await params;
    const body = await request.json();
    const { title, template, serpResults, selectedPages, status } = body;

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

    // Verify project exists and belongs to domain
    const existingProject = await db.query.contentProject.findFirst({
      where: and(
        eq(contentProject.id, projectId),
        eq(contentProject.domainId, domainId)
      ),
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Content project not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (template !== undefined) updateData.template = template;
    if (serpResults !== undefined) updateData.serpResults = serpResults;
    if (selectedPages !== undefined) updateData.selectedPages = selectedPages;
    if (status !== undefined) updateData.status = status;

    // Update the content project
    const [updatedProject] = await db
      .update(contentProject)
      .set(updateData)
      .where(eq(contentProject.id, projectId))
      .returning();

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error("Error updating content project:", error);
    return NextResponse.json(
      { error: "Failed to update content project" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/:organizationId/domains/:domainId/content/:projectId
// Deletes a content project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId, projectId } = await params;

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

    // Verify project exists and belongs to domain
    const existingProject = await db.query.contentProject.findFirst({
      where: and(
        eq(contentProject.id, projectId),
        eq(contentProject.domainId, domainId)
      ),
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Content project not found" },
        { status: 404 }
      );
    }

    // Delete the content project
    await db.delete(contentProject).where(eq(contentProject.id, projectId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content project:", error);
    return NextResponse.json(
      { error: "Failed to delete content project" },
      { status: 500 }
    );
  }
}

