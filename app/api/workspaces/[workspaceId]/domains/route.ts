import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { domain, workspace } from "@/db/schema";
import { generateId } from "@/lib/id";
import { eq, and } from "drizzle-orm";

type Params = Promise<{ workspaceId: string }>;

// GET /api/workspaces/[workspaceId]/domains - List all domains for a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace ownership
    const workspaceExists = await db.query.workspace.findFirst({
      where: and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)),
    });

    if (!workspaceExists) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const domains = await db.query.domain.findMany({
      where: eq(domain.workspaceId, workspaceId),
      with: {
        prompts: true,
      },
      orderBy: (domain, { desc }) => [desc(domain.createdAt)],
    });

    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/domains - Create a new domain
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace ownership
    const workspaceExists = await db.query.workspace.findFirst({
      where: and(eq(workspace.id, workspaceId), eq(workspace.userId, userId)),
    });

    if (!workspaceExists) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { domain: domainName, name } = body;

    if (!domainName || typeof domainName !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Clean the domain (remove protocol, trailing slashes, etc.)
    const cleanedDomain = domainName
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .trim();

    const id = generateId();

    const [newDomain] = await db
      .insert(domain)
      .values({
        id,
        domain: cleanedDomain,
        name: name || cleanedDomain,
        workspaceId,
      })
      .returning();

    return NextResponse.json({ domain: newDomain }, { status: 201 });
  } catch (error) {
    console.error("Error creating domain:", error);
    return NextResponse.json(
      { error: "Failed to create domain" },
      { status: 500 }
    );
  }
}
