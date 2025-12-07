import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { workspace } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = Promise<{ workspaceId: string }>;

// GET /api/workspaces/[workspaceId] - Get a single workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await db.query.workspace.findFirst({
      where: and(
        eq(workspace.id, workspaceId),
        eq(workspace.userId, userId)
      ),
      with: {
        domains: {
          with: {
            prompts: true,
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workspace: result });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[workspaceId] - Update a workspace
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Check ownership
    const existing = await db.query.workspace.findFirst({
      where: and(
        eq(workspace.id, workspaceId),
        eq(workspace.userId, userId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(workspace)
      .set({ name })
      .where(eq(workspace.id, workspaceId))
      .returning();

    return NextResponse.json({ workspace: updated });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId] - Delete a workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { workspaceId } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check ownership
    const existing = await db.query.workspace.findFirst({
      where: and(
        eq(workspace.id, workspaceId),
        eq(workspace.userId, userId)
      ),
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    await db.delete(workspace).where(eq(workspace.id, workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}

