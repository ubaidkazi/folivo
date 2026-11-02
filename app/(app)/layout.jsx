
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../../lib/auth";

export default async function AppLayout({ children }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
