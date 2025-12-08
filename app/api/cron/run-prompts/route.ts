import { NextRequest, NextResponse } from "next/server";
import { runAllPrompts } from "@/lib/prompt-runner";

// Vercel Cron configuration
// This endpoint will be called by Vercel's cron scheduler
// The cron schedule is configured in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === "production" && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("Starting scheduled prompt run...");
    const startTime = Date.now();

    const results = await runAllPrompts("chatgpt");

    const duration = Date.now() - startTime;

    // Calculate summary stats
    const totalPrompts = results.reduce((acc, r) => acc + r.results.length, 0);
    const successfulRuns = results.reduce(
      (acc, r) => acc + r.results.filter((pr) => pr.success).length,
      0
    );
    const mentions = results.reduce(
      (acc, r) => acc + r.results.filter((pr) => pr.mentioned).length,
      0
    );

    const summary = {
      domainsProcessed: results.length,
      totalPrompts,
      successfulRuns,
      failedRuns: totalPrompts - successfulRuns,
      mentions,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };

    console.log("Prompt run completed:", summary);

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      {
        error: "Failed to run prompts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers via API
export async function POST(request: NextRequest) {
  return GET(request);
}


