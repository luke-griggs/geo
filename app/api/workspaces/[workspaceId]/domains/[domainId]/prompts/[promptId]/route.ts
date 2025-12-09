import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { prompt, domain, workspace } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{
  workspaceId: string;
  domainId: string;
  promptId: string;
}>;

// Helper to verify ownership
async function verifyOwnership(
  workspaceId: string,
  domainId: string,
  promptId: string,
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

  const promptExists = await db.query.prompt.findFirst({
    where: and(eq(prompt.id, promptId), eq(prompt.domainId, domainId)),
  });

  if (!promptExists) {
    return { error: "Prompt not found", status: 404 };
  }

  return { prompt: promptExists };
}

// GET /api/workspaces/[workspaceId]/domains/[domainId]/prompts/[promptId] - Get a single prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId, promptId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyOwnership(
      workspaceId,
      domainId,
      promptId,
      userId
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const promptWithRuns = await db.query.prompt.findFirst({
      where: eq(prompt.id, promptId),
      with: {
        runs: {
          orderBy: (run, { desc }) => [desc(run.executedAt)],
          limit: 10, // Get last 10 runs
          with: {
            mentionAnalyses: true,
          },
        },
      },
    });

    return NextResponse.json({ prompt: promptWithRuns });
  } catch (error) {
    console.error("Error fetching prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt" },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[workspaceId]/domains/[domainId]/prompts/[promptId] - Update a prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId, promptId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await verifyOwnership(
      workspaceId,
      domainId,
      promptId,
      userId
    );
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
      isArchived,
      selectedProviders,
    } = body;

    const updateData: {
      promptText?: string;
      category?:
        | "brand"
        | "product"
        | "comparison"
        | "recommendation"
        | "problem_solution";
      location?: string | null;
      isActive?: boolean;
      isArchived?: boolean;
      selectedProviders?: string[];
    } = {};

    if (promptText !== undefined) updateData.promptText = promptText.trim();
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (selectedProviders !== undefined)
      updateData.selectedProviders = selectedProviders;

    const [updated] = await db
      .update(prompt)
      .set(updateData)
      .where(eq(prompt.id, promptId))
      .returning();

    return NextResponse.json({ prompt: updated });
  } catch (error) {
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/domains/[domainId]/prompts/[promptId] - Delete a prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId, promptId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyOwnership(
      workspaceId,
      domainId,
      promptId,
      userId
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    await db.delete(prompt).where(eq(prompt.id, promptId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
