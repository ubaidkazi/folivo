
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";

import { auth } from "../../lib/auth";
import { getFinancialSummary } from "../../lib/finance/summary";

import {
  getTransactionHistory,
  TransactionHistoryError,
} from "../../lib/finance/transaction-history";

import TransactionList from "@/components/transactions/transactionList";

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

const TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "EXPENSE", label: "Expenses" },
  { value: "INCOME", label: "Income" },
  { value: "TRANSFER", label: "Transfers" },
  {
    value: "CREDIT_CARD_PAYMENT",
    label: "Card Payments",
  },
];

function getPageHref(params, page) {
  const next = new URLSearchParams(params);

  next.set("page", String(page));

  return `/transactions?${next.toString()}`;
}

export default async function TransactionsPage({
  searchParams,
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Next.js 16 provides searchParams asynchronously.
  const rawParams = await searchParams;

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(
  rawParams ?? {}
)) {
  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    params.set(key, value);
  }
}

  const summary = await getFinancialSummary(
    session.user.id
  );

  if (!summary) {
    redirect("/onboarding");
  }

  let history = null;
  let filterError = "";

  try {
    history = await getTransactionHistory(
      session.user.id,
      params
    );
  } catch (error) {
    if (error instanceof TransactionHistoryError) {
      filterError = error.message;
    } else {
      throw error;
    }
  }

  const accounts = summary.accounts;

  const hasFilters = [
    "type",
    "accountId",
    "from",
    "to",
  ].some((key) => {
    const value = params.get(key);

    return value && value !== "ALL";
  });

  const pagination = history?.pagination;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
      {/* Page heading */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Transactions
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Review and filter your financial activity.
          </p>
        </div>

        <Link
          href="/transactions/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={17} />
          Add Transaction
        </Link>
      </header>

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Search size={18} className="text-primary" />

          <h2 className="text-sm font-semibold">
            Filter Transactions
          </h2>
        </div>

        <form
          action="/transactions"
          method="GET"
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="filter-type"
                className="text-xs font-medium"
              >
                Transaction Type
              </label>

              <select
                id="filter-type"
                name="type"
                defaultValue={params.get("type") ?? "ALL"}
                className={INPUT_CLASS}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="filter-account"
                className="text-xs font-medium"
              >
                Account
              </label>

              <select
                id="filter-account"
                name="accountId"
                defaultValue={
                  params.get("accountId") ?? ""
                }
                className={INPUT_CLASS}
              >
                <option value="">All Accounts</option>

                {accounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                    {account.isArchived
                      ? " (Archived)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="filter-from"
                className="text-xs font-medium"
              >
                From Date
              </label>

              <input
                id="filter-from"
                name="from"
                type="date"
                defaultValue={params.get("from") ?? ""}
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="filter-to"
                className="text-xs font-medium"
              >
                To Date
              </label>

              <input
                id="filter-to"
                name="to"
                type="date"
                defaultValue={params.get("to") ?? ""}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Apply Filters
            </button>

            {hasFilters && (
              <Link
                href="/transactions"
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-accent"
              >
                Clear Filters
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Transaction results */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-semibold">
              Transaction History
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {history
                ? `${pagination.total} transaction${
                    pagination.total === 1 ? "" : "s"
                  } found`
                : "Unable to load results"}
            </p>
          </div>

          {pagination && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-muted-foreground">
              Page {pagination.page}
              {pagination.totalPages > 0
                ? ` of ${pagination.totalPages}`
                : ""}
            </span>
          )}
        </div>

        {filterError ? (
          <div
            role="alert"
            className="m-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {filterError}
          </div>
        ) : (
          <>
            <div className="px-5 sm:px-6">
              <TransactionList
                transactions={history.transactions}
              />
            </div>

            {pagination.totalPages > 1 &&
                pagination.page <= pagination.totalPages && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  {(pagination.page - 1) *
                    pagination.pageSize +
                    1}
                  –
                  {Math.min(
                    pagination.page *
                      pagination.pageSize,
                    pagination.total
                  )}{" "}
                  of {pagination.total}
                </p>

                <div className="flex items-center gap-2">
                  {pagination.hasPreviousPage ? (
                    <Link
                      href={getPageHref(
                        params,
                        pagination.page - 1
                      )}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-accent"
                    >
                      <ChevronLeft size={15} />
                      Previous
                    </Link>
                  ) : (
                    <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground opacity-50">
                      <ChevronLeft size={15} />
                      Previous
                    </span>
                  )}

                  {pagination.hasNextPage ? (
                    <Link
                      href={getPageHref(
                        params,
                        pagination.page + 1
                      )}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-accent"
                    >
                      Next
                      <ChevronRight size={15} />
                    </Link>
                  ) : (
                    <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground opacity-50">
                      Next
                      <ChevronRight size={15} />
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
