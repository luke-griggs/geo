import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { prompt, domain, workspace } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq, and } from "drizzle-orm";

type Params = Promise<{ workspaceId: string; domainId: string }>;

// Helper to verify ownership
async function verifyOwnership(
  workspaceId: string,
  domainId: string,
  userId: string
) {
  const workspaceExists = await db.query.workspace.findFirst({
    where: and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)),
  });

  if (!workspaceExists) {
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

// POST /api/workspaces/[workspaceId]/domains/[domainId]/prompts/bulk - Bulk create prompts
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyOwnership(workspaceId, domainId, userId);
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
