import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { workspace, domain } from "@/db/schema";
import { generateId, generateUniqueSlug, slugify } from "@/lib/id";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/workspaces - List all workspaces for the current user
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await db.query.workspace.findMany({
      where: eq(workspace.userId, session.user.id),
      with: {
        domains: true,
      },
      orderBy: (workspace, { desc }) => [desc(workspace.createdAt)],
    });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces - Create a new workspace (and optionally a domain)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, domain: domainUrl, competitors } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const workspaceId = generateId();
    const slug = generateUniqueSlug(name);

    // Create the workspace
    const [newWorkspace] = await db
      .insert(workspace)
      .values({
        id: workspaceId,
        name,
        slug,
        userId: session.user.id,
      })
      .returning();

    let newDomain = null;

    // If a domain was provided, create it
    if (domainUrl && typeof domainUrl === "string") {
      // Clean up the domain URL
      let cleanDomain = domainUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .toLowerCase();

      const domainId = generateId();

      [newDomain] = await db
        .insert(domain)
        .values({
          id: domainId,
          domain: cleanDomain,
          name: name, // Use workspace name as domain friendly name
          workspaceId: workspaceId,
          verified: false,
        })
        .returning();
    }

    return NextResponse.json(
      {
        workspace: newWorkspace,
        domain: newDomain,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
