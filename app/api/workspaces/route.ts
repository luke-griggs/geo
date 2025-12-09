import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import {
  organization,
  organizationMember,
  domain,
  topic,
  prompt,
} from "@/db/schema";
import { generateId, generateUniqueSlug } from "@/lib/id";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface TopicInput {
  name: string;
  description?: string;
}

interface GeneratedPrompt {
  text: string;
  category:
    | "brand"
    | "product"
    | "comparison"
    | "recommendation"
    | "problem_solution";
}

// Helper to generate prompts for a topic using Groq
async function generatePromptsForTopic(
  topicName: string,
  domainUrl: string,
  workspaceName: string,
  count: number = 5
): Promise<GeneratedPrompt[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY not configured");
    return [];
  }

  const systemPrompt = `You are an expert at crafting search queries that people would ask AI assistants like ChatGPT, Claude, or Perplexity. Given a topic and company context, generate ${count} realistic search prompts.

The prompts should:
- Sound natural, like how a real person would ask an AI assistant
- Be specific enough to trigger meaningful responses
- Vary in intent (informational, comparison, recommendation, problem-solving)
- Include the company/brand name where appropriate
- Be 5-20 words each

Categories:
- "brand": Direct brand/company related questions
- "product": Product-specific queries
- "comparison": Comparing options or alternatives
- "recommendation": Asking for suggestions
- "problem_solution": Looking to solve a specific problem

Return ONLY a valid JSON array of objects with "text" and "category" fields. No markdown, no explanations.`;

  const userPrompt = `Topic: ${topicName}
Domain: ${domainUrl}
Company: ${workspaceName}

Generate ${count} search prompts that someone interested in "${topicName}" might ask an AI assistant.`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick-17b-128e-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      console.error("Groq API error:", await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return [];

    const cleanedContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const prompts: GeneratedPrompt[] = JSON.parse(cleanedContent);
    const validCategories = [
      "brand",
      "product",
      "comparison",
      "recommendation",
      "problem_solution",
    ];

    return prompts
      .filter((p) => typeof p.text === "string" && p.text.length > 0)
      .slice(0, count)
      .map((p) => ({
        text: p.text,
        category: validCategories.includes(p.category)
          ? (p.category as GeneratedPrompt["category"])
          : "brand",
      }));
  } catch (error) {
    console.error("Error generating prompts:", error);
    return [];
  }
}

// GET /api/workspaces - List all workspaces/organizations for the current user
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizations created by the user
    const createdOrgs = await db.query.organization.findMany({
      where: eq(organization.userId, session.user.id),
      with: {
        domains: true,
      },
    });

    // Get organizations where user is a member
    const memberships = await db.query.organizationMember.findMany({
      where: eq(organizationMember.userId, session.user.id),
    });

    // Fetch full org details for memberships
    const memberOrgIds = memberships
      .map((m) => m.organizationId)
      .filter((id) => !createdOrgs.some((org) => org.id === id));

    const memberOrgs: typeof createdOrgs = [];
    if (memberOrgIds.length > 0) {
      // Fetch orgs the user is a member of but didn't create
      for (const orgId of memberOrgIds) {
        const org = await db.query.organization.findFirst({
          where: eq(organization.id, orgId),
          with: {
            domains: true,
          },
        });
        if (org) {
          memberOrgs.push(org);
        }
      }
    }

    // Combine and sort
    const workspaces = [...createdOrgs, ...memberOrgs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces - Create a new workspace/organization (and optionally a domain with topics)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      domain: domainUrl,
      topics: topicInputs,
    } = body as {
      name: string;
      domain?: string;
      topics?: TopicInput[];
    };

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const workspaceId = generateId();
    const slug = generateUniqueSlug(name);

    // Create the organization (workspace)
    const [newWorkspace] = await db
      .insert(organization)
      .values({
        id: workspaceId,
        name,
        slug,
        userId: session.user.id,
      })
      .returning();

    // Create owner membership
    const memberId = generateId();
    await db.insert(organizationMember).values({
      id: memberId,
      organizationId: workspaceId,
      userId: session.user.id,
      role: "owner",
    });

    let newDomain = null;
    const createdTopics: Array<{ id: string; name: string }> = [];
    let totalPromptsCreated = 0;

    // If a domain was provided, create it
    if (domainUrl && typeof domainUrl === "string") {
      // Clean up the domain URL
      const cleanDomain = domainUrl
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

      // If topics were provided, create them and generate prompts
      if (topicInputs && Array.isArray(topicInputs) && topicInputs.length > 0) {
        // Process topics in parallel (but limit to 5 concurrent to avoid rate limits)
        const BATCH_SIZE = 5;
        for (let i = 0; i < topicInputs.length; i += BATCH_SIZE) {
          const batch = topicInputs.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (topicInput) => {
              const topicId = generateId();

              // Create the topic
              const [newTopic] = await db
                .insert(topic)
                .values({
                  id: topicId,
                  name: topicInput.name,
                  description: topicInput.description || null,
                  domainId: domainId,
                })
                .returning();

              createdTopics.push({ id: newTopic.id, name: newTopic.name });

              // Generate prompts for this topic
              const generatedPrompts = await generatePromptsForTopic(
                topicInput.name,
                cleanDomain,
                name,
                5 // 5 prompts per topic
              );

              // Create prompts in the database
              if (generatedPrompts.length > 0) {
                const promptValues = generatedPrompts.map((p) => ({
                  id: generateId(),
                  promptText: p.text,
                  category: p.category,
                  domainId: domainId,
                  topicId: topicId,
                  isActive: true,
                  isArchived: false,
                  selectedProviders: ["chatgpt"] as string[],
                }));

                await db.insert(prompt).values(promptValues);
                totalPromptsCreated += promptValues.length;
              }
            })
          );
        }
      }
    }

    return NextResponse.json(
      {
        workspace: newWorkspace,
        domain: newDomain,
        topics: createdTopics,
        promptsCreated: totalPromptsCreated,
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
