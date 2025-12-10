import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, organization, prompt } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runSinglePrompt } from "@/lib/prompt-runner";
import type { LLMProvider } from "@/lib/llm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{
  organizationId: string;
  domainId: string;
  promptId: string;
}>;

// POST /api/organizations/[organizationId]/domains/[domainId]/prompts/[promptId]/run
// Run inference for a single prompt
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { organizationId, domainId, promptId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify organization ownership
    const orgExists = await db.query.organization.findFirst({
      where: and(
        eq(organization.id, organizationId),
        eq(organization.userId, userId)
      ),
    });

    if (!orgExists) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Verify domain belongs to organization
    const domainExists = await db.query.domain.findFirst({
      where: and(
        eq(domain.id, domainId),
        eq(domain.workspaceId, organizationId)
      ),
    });

    if (!domainExists) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Verify prompt belongs to domain
    const promptExists = await db.query.prompt.findFirst({
      where: and(eq(prompt.id, promptId), eq(prompt.domainId, domainId)),
    });

    if (!promptExists) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    // Get provider from body or default to chatgpt
    const body = await request.json().catch(() => ({}));
    const provider: LLMProvider = body.provider || "chatgpt";

    // Run the single prompt
    const result = await runSinglePrompt(promptId, provider);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error("Error running prompt:", error);
    return NextResponse.json(
      {
        error: "Failed to run prompt",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
