import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { prompt, domain, workspace } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq, and } from "drizzle-orm";
import { runSinglePrompt } from "@/lib/prompt-runner";
import type { LLMProvider } from "@/lib/llm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

// GET /api/workspaces/[workspaceId]/domains/[domainId]/prompts - List all prompts for a domain
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await verifyOwnership(workspaceId, domainId, userId);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const prompts = await db.query.prompt.findMany({
      where: activeOnly
        ? and(eq(prompt.domainId, domainId), eq(prompt.isActive, true))
        : eq(prompt.domainId, domainId),
      with: {
        runs: {
          orderBy: (run, { desc }) => [desc(run.executedAt)],
          limit: 1, // Just get the latest run for each prompt
          with: {
            mentionAnalyses: true, // Include mention analyses for scoring
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

// POST /api/workspaces/[workspaceId]/domains/[domainId]/prompts - Create a new prompt
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId, domainId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await verifyOwnership(workspaceId, domainId, userId);
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

// Bulk create prompts
// POST /api/workspaces/[workspaceId]/domains/[domainId]/prompts/bulk
// This is handled as a separate endpoint, but we can also support it here
// by checking the body structure
