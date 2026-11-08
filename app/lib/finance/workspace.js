
import "server-only";

import { prisma } from "../prisma";

/**
 * Retrieve the personal workspace status for
 * an authenticated user.
 *
 * This function must only be called on the server.
 */
export async function getWorkspaceStatus(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const workspace = await prisma.financialEntity.findUnique({
    where: {
      ownerId: userId,
    },
    select: {
      id: true,
      onboardingCompletedAt: true,
    },
  });

  return {
    hasWorkspace: Boolean(workspace),
    onboardingComplete: Boolean(
      workspace?.onboardingCompletedAt
    ),
    workspaceId: workspace?.id ?? null,
  };
}
