import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { prompt, domain, organization, organizationMember } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq, and } from "drizzle-orm";
import { runSinglePrompt } from "@/lib/prompt-runner";
import type { LLMProvider } from "@/lib/llm";
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

// GET /api/organizations/[organizationId]/domains/[domainId]/prompts - List all prompts for a domain
export async function GET(
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const archived = searchParams.get("archived") === "true";

    // Build where conditions
    const conditions = [eq(prompt.domainId, domainId)];
    if (activeOnly) {
      conditions.push(eq(prompt.isActive, true));
    }
    // Filter by archived status (default to showing non-archived)
    conditions.push(eq(prompt.isArchived, archived));

    const prompts = await db.query.prompt.findMany({
      where: and(...conditions),
      with: {
        runs: {
          orderBy: (run, { desc }) => [desc(run.executedAt)],
          limit: 1, // Just get the latest run for each prompt
          with: {
            mentionAnalyses: true, // Include mention analyses for scoring
            brandMentions: true, // Include brand mentions for top brands display
          },
        },
      },
      orderBy: (prompt, { desc }) => [desc(prompt.createdAt)],
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

// POST /api/organizations/[organizationId]/domains/[domainId]/prompts - Create a new prompt
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
    const {
      promptText,
      category,
      location,
      isActive,
      runAfterCreate,
      provider,
    } = body;

    if (!promptText || typeof promptText !== "string") {
      return NextResponse.json(
        { error: "Prompt text is required" },
        { status: 400 }
      );
    }

    const id = generateId();

    const [newPrompt] = await db
      .insert(prompt)
      .values({
        id,
        promptText: promptText.trim(),
        category: category || "brand",
        location: location || null,
        isActive: isActive !== false, // Default to true
        domainId,
      })
      .returning();

    // Optionally run inference for the new prompt
    let runResult = null;
    if (runAfterCreate) {
      try {
        const llmProvider: LLMProvider = provider || "chatgpt";
        runResult = await runSinglePrompt(id, llmProvider);
      } catch (error) {
        console.error("Error running prompt after creation:", error);
        // Don't fail the whole request if running fails
        runResult = {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to run prompt",
        };
      }
    }

    return NextResponse.json(
      {
        prompt: newPrompt,
        runResult,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}
