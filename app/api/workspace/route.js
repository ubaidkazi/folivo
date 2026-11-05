
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

import {
  OnboardingValidationError,
  validateOnboardingInput,
  createPersonalWorkspace,
} from "../../lib/finance/onboarding";

async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

// GET /api/workspace
// Retrieve the authenticated user's personal workspace.
export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const workspace = await prisma.financialEntity.findUnique({
      where: { ownerId: user.id },
      include: {
        financialAccounts: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            isArchived: true,
          },
        },
      },
    });

    return NextResponse.json({
      hasWorkspace: Boolean(workspace),
      onboardingComplete:
        Boolean(workspace?.onboardingCompletedAt),
      workspace,
    });
  } catch (error) {
    console.error("Workspace lookup failed:", error);

    return NextResponse.json(
      { error: "Failed to load workspace." },
      { status: 500 }
    );
  }
}

// POST /api/workspace
// Create a personal workspace with initial accounts.
export async function POST(request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  try {
    const input = validateOnboardingInput(body);

    const existing = await prisma.financialEntity.findUnique({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A personal workspace already exists." },
        { status: 409 }
      );
    }

    const workspace = await createPersonalWorkspace(
      user.id,
      input
    );

    return NextResponse.json(
      {
        message: "Workspace created successfully.",
        workspace,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof OnboardingValidationError) {
      const isDuplicate =
        error.message ===
        "You already have a financial workspace.";

      return NextResponse.json(
        { error: error.message },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    // Unique constraint also catches concurrent attempts.
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A workspace already exists or conflicts with an existing record." },
        { status: 409 }
      );
    }

    console.error("Workspace creation failed:", error);

    return NextResponse.json(
      { error: "Failed to create workspace." },
      { status: 500 }
    );
  }
}
