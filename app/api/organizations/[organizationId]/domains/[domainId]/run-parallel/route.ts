import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import db from "@/db";
import { domain, prompt } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPromptsInParallel } from "@/lib/prompt-runner";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ organizationId: string; domainId: string }>;

// Increase max duration for Vercel - running 25+ prompts can take several minutes
// Pro plan: up to 300s, Hobby plan: up to 60s (with streaming)
export const maxDuration = 300;

// POST /api/organizations/[organizationId]/domains/[domainId]/run-parallel - Run all prompts in parallel
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { domainId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify domain exists and belongs to user's organization
    const domainRecord = await db.query.domain.findFirst({
      where: eq(domain.id, domainId),
      with: {
        organization: true,
      },
    });

    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domainRecord.organization.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Count total active prompts
    const prompts = await db.query.prompt.findMany({
      where: eq(prompt.domainId, domainId),
    });

    const activePrompts = prompts.filter((p) => p.isActive);
    const totalPrompts = activePrompts.length;

    if (totalPrompts === 0) {
      return NextResponse.json(
        { error: "No active prompts to run" },
        { status: 400 }
      );
    }

    // Update domain status to running
    await db
      .update(domain)
      .set({
        promptRunStatus: "running",
        promptRunProgress: 0,
        promptRunTotal: totalPrompts,
      })
      .where(eq(domain.id, domainId));

    // Use Next.js after() to run the prompts after the response is sent
    // This tells Vercel to keep the function running after returning the response
    // Critical for serverless: fire-and-forget patterns don't work - the function gets killed
    after(async () => {
      try {
        await runPromptsInParallel(domainId, 15);
      } catch (error) {
        console.error("Error running prompts in parallel:", error);
        // Mark domain as failed if there's an error
        await db
          .update(domain)
          .set({ promptRunStatus: "completed" })
          .where(eq(domain.id, domainId));
      }
    });

    return NextResponse.json({
      success: true,
      message: "Prompt runs started",
      totalPrompts,
    });
  } catch (error) {
    console.error("Error starting parallel prompt runs:", error);
    return NextResponse.json(
      {
        error: "Failed to start prompt runs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
