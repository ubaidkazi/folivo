import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../../lib/auth";

export default async function AuthLayout({ children }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-3"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
            F
          </span>

          <span className="text-2xl font-semibold tracking-tight">
            Folivo
          </span>
        </Link>

        {children}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          A clearer picture of your money.
        </p>
      </div>
    </main>
  );
}