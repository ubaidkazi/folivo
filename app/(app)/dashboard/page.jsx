
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import {
  Wallet,
  TrendingUp,
  CreditCard,
  Landmark,
  PiggyBank,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Info,
} from "lucide-react";

import { auth } from "../../lib/auth";
import { getFinancialSummary } from "../../lib/finance/summary";

// Monetary values are returned by our service
// as strings representing BigInt cents.
function formatMoney(value) {
  const cents = BigInt(value);
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;

  const dollars = absolute / 100n;
  const fraction = (absolute % 100n)
    .toString()
    .padStart(2, "0");

  const formattedDollars = new Intl.NumberFormat(
    "en-US"
  ).format(dollars);

  return `${negative ? "-" : ""}$${formattedDollars}.${fraction}`;
}

const accountConfig = {
  CHECKING: {
    label: "Checking",
    icon: Landmark,
  },
  SAVINGS: {
    label: "Savings",
    icon: PiggyBank,
  },
  CASH: {
    label: "Cash",
    icon: Banknote,
  },
  CREDIT_CARD: {
    label: "Credit Card",
    icon: CreditCard,
  },
};

function SummaryCard({ title, value, icon: Icon, description }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon size={20} />
        </div>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        {title}
      </p>

      <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {value}
      </h2>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function AccountRow({ account }) {
  const config = accountConfig[account.type] ?? {
    label: account.type,
    icon: Wallet,
  };

  const Icon = config.icon;
  const isCreditCard = account.type === "CREDIT_CARD";
  const balance = BigInt(account.balanceCents);

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold">
          {account.name}
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          {config.label}
          {account.isArchived ? " · Archived" : ""}
        </p>
      </div>

      <div className="min-w-0 text-right">
        <p className="break-words text-sm font-semibold tabular-nums sm:text-base">
          {formatMoney(account.balanceCents)}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {isCreditCard
            ? balance < 0n
              ? "Credit balance"
              : "Amount owed"
            : "Current balance"}
        </p>
      </div>
    </div>
  );
}

function ComingSoonCard({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-muted-foreground">
        <Icon size={19} />
      </div>

      <div>
        <h3 className="text-sm font-semibold">{title}</h3>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>

        <span className="mt-3 inline-block text-xs font-medium text-primary">
          Coming soon
        </span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  // Authenticate on the server.
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Call the service directly.
  // No HTTP request to our own API is needed.
  const summary = await getFinancialSummary(
    session.user.id
  );

  if (!summary) {
    redirect("/onboarding");
  }

  const { workspace, accounts, totals } = summary;

  const firstName =
    session.user.name?.trim().split(/\s+/)[0] || "there";

  const activeAccounts = accounts.filter(
    (account) => !account.isArchived
  );

  const archivedAccounts = accounts.filter(
    (account) => account.isArchived
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
      {/* Page heading */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Welcome back, {firstName}
          </p>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Financial Overview
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your financial position, all in one place.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
          {workspace.currency} · {workspace.name}
        </div>


        
          <Link
            href="/transactions/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus size={17} />
            Add Transaction
          </Link>


      </header>

      {/* Financial summary */}
      <section aria-label="Financial summary">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Your financial snapshot
          </h2>

          <span className="text-xs text-muted-foreground">
            All accounts
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Net Worth"
            value={formatMoney(totals.netWorthCents)}
            icon={Wallet}
            description="Your total assets minus your liabilities."
          />

          <SummaryCard
            title="Total Assets"
            value={formatMoney(totals.assetsCents)}
            icon={ArrowUpRight}
            description="Money held in checking, savings, and cash accounts."
          />

          <SummaryCard
            title="Total Liabilities"
            value={formatMoney(totals.liabilitiesCents)}
            icon={ArrowDownRight}
            description="Outstanding balances on your credit cards."
          />
        </div>
      </section>

      {/* Accounts and upcoming features */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section className="min-w-0 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-base font-semibold">
                Your Accounts
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Balances calculated from your financial ledger.
              </p>
            </div>

            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-muted-foreground">
              {activeAccounts.length} active
            </span>
          </div>

          <div className="px-5 sm:px-6">
            {activeAccounts.length === 0 ? (
              <div className="py-12 text-center">
                <Landmark
                  size={27}
                  className="mx-auto text-muted-foreground"
                />

                <h3 className="mt-4 text-sm font-semibold">
                  No accounts yet
                </h3>

                <p className="mt-2 text-xs text-muted-foreground">
                  Your financial accounts will appear here
                  once added.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeAccounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                  />
                ))}
              </div>
            )}
          </div>

          {archivedAccounts.length > 0 && (
            <div className="border-t border-border px-5 py-4 sm:px-6">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Archived accounts
              </p>

              <div className="divide-y divide-border">
                {archivedAccounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <ComingSoonCard
            icon={TrendingUp}
            title="Income & Spending"
            description="Track your monthly income, expenses, and spending trends once transaction tracking is available."
          />

          <ComingSoonCard
            icon={Activity}
            title="Recent Activity"
            description="Your latest financial transactions will appear here as you begin recording activity."
          />

          <div className="flex items-start gap-3 rounded-xl border border-border bg-accent/40 p-4">
            <Info
              size={18}
              className="mt-0.5 shrink-0 text-primary"
            />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Account balances are derived from posted
              journal entries. Opening balances are not
              treated as income or expenses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
