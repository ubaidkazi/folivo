
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../lib/auth";
import { getWorkspaceStatus } from "../lib/finance/workspace";

import AppSidebar from "../../components/layout/AppSidebar";
import AppHeader from "../../components/layout/AppHeader";

export default async function AppLayout({ children }) {
  // 1. Check authentication.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // 2. Check whether financial onboarding is complete.
  const { onboardingComplete } = await getWorkspaceStatus(
    session.user.id
  );

  if (!onboardingComplete) {
    redirect("/onboarding");
  }

  // 3. Render the application only for
  // authenticated, onboarded users.
  const user = {
    name: session.user.name,
    email: session.user.email,
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} />

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
