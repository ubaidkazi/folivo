
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../lib/auth";

import AppSidebar from "../../components/layout/AppSidebar";
import AppHeader from  "@/components/layout/AppHeader";

export default async function AppLayout({ children }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

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
