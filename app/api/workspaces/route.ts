import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { workspace } from '@/db/schema';
import { generateId, generateUniqueSlug } from '@/lib/id';
import { eq } from 'drizzle-orm';

// GET /api/workspaces - List all workspaces for the current user
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from auth session
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workspaces = await db.query.workspace.findMany({
      where: eq(workspace.userId, userId),
      with: {
        domains: true,
      },
      orderBy: (workspace, { desc }) => [desc(workspace.createdAt)],
    });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces - Create a new workspace
export async function POST(request: NextRequest) {
  try {
    // TODO: Get userId from auth session
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const id = generateId();
    const slug = generateUniqueSlug(name);

    const [newWorkspace] = await db.insert(workspace).values({
      id,
      name,
      slug,
      userId,
    }).returning();

    return NextResponse.json({ workspace: newWorkspace }, { status: 201 });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}

