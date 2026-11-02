
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/auth/layout/AppSidebar";
import { auth } from "../../lib/auth";

export default async function AppLayout({ children }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
