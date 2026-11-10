
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "../../../lib/auth";
import { getFinancialSummary } from "../../../lib/finance/summary";

import TransactionWizard from "@/components/transactions/transactionWizard";

export default async function NewTransactionPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const summary = await getFinancialSummary(
    session.user.id
  );

  if (!summary) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <TransactionWizard
        accounts={summary.accounts}
        currency={summary.workspace.currency}
      />
    </main>
  );
}
