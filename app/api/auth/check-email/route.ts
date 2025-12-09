import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import db from "@/db";
import { user } from "@/db/schema";

// POST /api/auth/check-email
// Checks if an email is already registered
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists with this email
    const existingUser = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.email, email.toLowerCase()))
      .limit(1);

    return NextResponse.json({
      exists: existingUser.length > 0,
      name: existingUser[0]?.name || null,
    });
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    );
  }
}
