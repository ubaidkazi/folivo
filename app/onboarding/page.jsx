
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

import OnboardingWizard from "@/components/onboarding/onboardingWizard";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  //check if user has already finished onboarding then redirect to the dashboard
  const workspace = await prisma.financialEntity.findUnique({
    where: {
      ownerId: session.user.id,
    },
    select: {
      onboardingCompletedAt: true,
    },
  });

  if (workspace?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
