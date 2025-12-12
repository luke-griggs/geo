import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, topic, organization, organizationMember } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateId } from "@/lib/id";

interface RouteParams {
  params: Promise<{
    organizationId: string;
    domainId: string;
  }>;
}

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

// GET /api/organizations/:organizationId/domains/:domainId/topics
// Returns all topics for a domain with their prompts
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId } = await params;

    // Verify organization ownership/membership
    const org = await checkOrgAccess(organizationId, session.user.id);

    if (!org) {
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

    // Get all topics for this domain with their prompts
    const topics = await db.query.topic.findMany({
      where: eq(topic.domainId, domainId),
      with: {
        prompts: {
          where: (prompt, { eq }) => eq(prompt.isArchived, false),
        },
      },
      orderBy: (topic, { asc }) => [asc(topic.name)],
    });

    // Transform to include prompt count
    const topicsWithCounts = topics.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      promptCount: t.prompts.length,
      prompts: t.prompts.map((p) => ({
        id: p.id,
        promptText: p.promptText,
        category: p.category,
        isActive: p.isActive,
      })),
    }));

    return NextResponse.json({ topics: topicsWithCounts });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}

interface TopicInput {
  name: string;
  description?: string;
}

// POST /api/organizations/:organizationId/domains/:domainId/topics
// Creates topics in bulk for a domain
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, domainId } = await params;

    // Verify organization ownership/membership
    const org = await checkOrgAccess(organizationId, session.user.id);

    if (!org) {
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

    const body = await request.json();
    const { topics: topicsToCreate } = body as { topics: TopicInput[] };

    if (!Array.isArray(topicsToCreate) || topicsToCreate.length === 0) {
      return NextResponse.json(
        { error: "Topics array is required" },
        { status: 400 }
      );
    }

    // Validate all topics have a name
    const invalidTopics = topicsToCreate.filter(
      (t) => !t.name || typeof t.name !== "string"
    );
    if (invalidTopics.length > 0) {
      return NextResponse.json(
        { error: "All topics must have a name field" },
        { status: 400 }
      );
    }

    // Create all topics
    const topicValues = topicsToCreate.map((t) => ({
      id: generateId(),
      name: t.name.trim(),
      description: t.description?.trim() || null,
      domainId,
    }));

    const newTopics = await db.insert(topic).values(topicValues).returning();

    return NextResponse.json(
      {
        topics: newTopics,
        count: newTopics.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating topics:", error);
    return NextResponse.json(
      { error: "Failed to create topics" },
      { status: 500 }
    );
  }
}
