import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { prompt, domain, organization, organizationMember } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ organizationId: string; domainId: string }>;

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
  organizationId: string,
  domainId: string,
  userId: string
) {
  const org = await checkOrgAccess(organizationId, userId);

  if (!org) {
    return { error: "Organization not found", status: 404 };
  }

  const domainExists = await db.query.domain.findFirst({
    where: and(eq(domain.id, domainId), eq(domain.workspaceId, organizationId)),
  });

  if (!domainExists) {
    return { error: "Domain not found", status: 404 };
  }

  return { domain: domainExists };
}

interface BulkPrompt {
  promptText: string;
  category?:
    | "brand"
    | "product"
    | "comparison"
    | "recommendation"
    | "problem_solution";
  location?: string;
  isActive?: boolean;
}

// POST /api/organizations/[organizationId]/domains/[domainId]/prompts/bulk - Bulk create prompts
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { organizationId, domainId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await verifyOwnership(organizationId, domainId, userId);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const body = await request.json();
    const { prompts: promptsToCreate } = body as { prompts: BulkPrompt[] };

    if (!Array.isArray(promptsToCreate) || promptsToCreate.length === 0) {
      return NextResponse.json(
        { error: "Prompts array is required" },
        { status: 400 }
      );
    }

    // Validate all prompts have text
    const invalidPrompts = promptsToCreate.filter(
      (p) => !p.promptText || typeof p.promptText !== "string"
    );
    if (invalidPrompts.length > 0) {
      return NextResponse.json(
        { error: "All prompts must have a promptText field" },
        { status: 400 }
      );
    }

    // Create all prompts
    const promptValues = promptsToCreate.map((p) => ({
      id: generateId(),
      promptText: p.promptText.trim(),
      category: p.category || ("brand" as const),
      location: p.location || null,
      isActive: p.isActive !== false,
      domainId,
    }));

    const newPrompts = await db.insert(prompt).values(promptValues).returning();

    return NextResponse.json(
      {
        prompts: newPrompts,
        count: newPrompts.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating prompts:", error);
    return NextResponse.json(
      { error: "Failed to create prompts" },
      { status: 500 }
    );
  }
}
