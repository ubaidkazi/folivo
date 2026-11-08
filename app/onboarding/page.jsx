
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../lib/auth";
import { getWorkspaceStatus } from "../lib/finance/workspace";

import OnboardingWizard from "../../components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  // Authentication is required.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Users who already completed onboarding
  // should not see the setup wizard again.
  const { onboardingComplete } = await getWorkspaceStatus(
    session.user.id
  );

  if (onboardingComplete) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
