
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Info,
} from "lucide-react";

const TRANSACTION_TYPES = [
  {
    value: "EXPENSE",
    label: "Expense",
    description: "Record money you've spent",
    icon: ArrowUpRight,
  },
  {
    value: "INCOME",
    label: "Income",
    description: "Record money you've received",
    icon: ArrowDownLeft,
  },
  {
    value: "TRANSFER",
    label: "Transfer",
    description: "Move money between accounts",
    icon: ArrowLeftRight,
  },
  {
    value: "CREDIT_CARD_PAYMENT",
    label: "Card Payment",
    description: "Pay down credit card debt",
    icon: CreditCard,
  },
];

const ASSET_TYPES = new Set([
  "CHECKING",
  "SAVINGS",
  "CASH",
]);

const ACCOUNT_LABELS = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
};

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function getLocalToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidAmount(value) {
  const amount = value.trim();

  if (!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(amount)) {
    return false;
  }

  const [dollars, fraction = ""] = amount.split(".");

  const cents =
    BigInt(dollars) * 100n +
    BigInt(fraction.padEnd(2, "0") || "0");

  return cents > 0n;
}

function formatMoney(value) {
  const cents = BigInt(value);
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;

  const dollars = new Intl.NumberFormat("en-US").format(
    absolute / 100n
  );

  const fraction = (absolute % 100n)
    .toString()
    .padStart(2, "0");

  return `${negative ? "-" : ""}$${dollars}.${fraction}`;
}

function getAccountLabel(account) {
  const balance = formatMoney(account.balanceCents);

  return `${account.name} · ${balance}${
    account.type === "CREDIT_CARD" ? " owed" : ""
  }`;
}

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>

      {children}

      {hint && (
        <p className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function TransactionWizard({
  accounts,
  currency,
}) {
  const router = useRouter();

  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] =
    useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  // Reuse the same key when retrying an uncertain request.
  const requestKeyRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setDate(getLocalToday());
  }, []);

  const activeAccounts = accounts.filter(
    (account) => !account.isArchived
  );

  const assetAccounts = activeAccounts.filter(
    (account) => ASSET_TYPES.has(account.type)
  );

  const creditCards = activeAccounts.filter(
    (account) => account.type === "CREDIT_CARD"
  );

  const needsDestination =
    type === "TRANSFER" ||
    type === "CREDIT_CARD_PAYMENT";

  const sourceAccounts =
    type === "EXPENSE"
      ? activeAccounts.filter(
          (account) =>
            ASSET_TYPES.has(account.type) ||
            account.type === "CREDIT_CARD"
        )
      : assetAccounts;

  const destinationAccounts =
    type === "TRANSFER"
      ? assetAccounts.filter(
          (account) => account.id !== accountId
        )
      : type === "CREDIT_CARD_PAYMENT"
        ? creditCards
        : [];

  const selectedType = TRANSACTION_TYPES.find(
    (item) => item.value === type
  );

  const sourceLabel =
    type === "INCOME"
      ? "Received into"
      : type === "EXPENSE"
        ? "Paid with"
        : "From account";

  const destinationLabel =
    type === "CREDIT_CARD_PAYMENT"
      ? "Credit card to pay"
      : "To account";

  const canSubmit =
    Boolean(type) &&
    isValidAmount(amount) &&
    Boolean(date) &&
    Boolean(accountId) &&
    (!needsDestination || Boolean(destinationAccountId)) &&
    (!needsDestination || accountId !== destinationAccountId) &&
    !isSubmitting;

  function clearFeedback() {
    setError("");
    setSuccess(null);
    requestKeyRef.current = null;
  }

  function selectTransactionType(nextType) {
    if (isSubmitting) return;

    setType(nextType);
    setAmount("");
    setAccountId("");
    setDestinationAccountId("");
    setDescription("");

    clearFeedback();
  }

  function changeSource(nextId) {
    setAccountId(nextId);
    setDestinationAccountId("");
    clearFeedback();
  }

  function resetForm() {
    setType("");
    setAmount("");
    setAccountId("");
    setDestinationAccountId("");
    setDescription("");
    setDate(getLocalToday());

    clearFeedback();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsSubmitting(true);
    setError("");

    if (!requestKeyRef.current) {
      requestKeyRef.current = crypto.randomUUID();
    }

    const payload = {
      type,
      accountId,
      amount: amount.trim(),
      date,
      description: description.trim(),
      idempotencyKey: requestKeyRef.current,
    };

    if (needsDestination) {
      payload.destinationAccountId = destinationAccountId;
    }

    try {
      const response = await fetch(
        "/api/workspace/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            "This request may already have been recorded. Check your account balances before trying again."
          );
        }

        throw new Error(
          data?.error || "Unable to record transaction."
        );
      }

      setSuccess(data.transaction);

      // Invalidate the current route's server-rendered data.
      // The dashboard will read updated balances on navigation.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center sm:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          <CheckCircle2 size={34} />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Transaction Recorded
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Your transaction has been saved to your
          financial ledger.
        </p>

        <div className="mx-auto mt-7 max-w-sm rounded-xl border border-border bg-background p-5 text-left">
          <p className="text-xs text-muted-foreground">
            Transaction type
          </p>

          <p className="mt-1 text-sm font-medium">
            {TRANSACTION_TYPES.find(
              (item) => item.value === success.type
            )?.label ?? success.type}
          </p>

          <p className="mt-5 text-xs text-muted-foreground">
            Amount
          </p>

          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatMoney(success.amountCents)}
          </p>

          <p className="mt-5 text-xs text-muted-foreground">
            Date
          </p>

          <p className="mt-1 text-sm font-medium">
            {success.date}
          </p>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Record Another
          </button>

          <Link
            href="/dashboard"
            className="rounded-xl border border-border px-6 py-3 text-sm font-medium transition hover:bg-accent"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header>
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          New Transaction
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Record financial activity in your Folivo workspace.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">
            1. What would you like to record?
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Choose the transaction type to continue.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRANSACTION_TYPES.map((item) => {
            const Icon = item.icon;
            const selected = type === item.value;

            return (
              <button
                key={item.value}
                type="button"
                disabled={isSubmitting}
                aria-pressed={selected}
                onClick={() =>
                  selectTransactionType(item.value)
                }
                className={`rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                  selected
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary">
                    <Icon size={20} />
                  </div>

                  {selected && (
                    <CheckCircle2
                      size={19}
                      className="text-primary"
                    />
                  )}
                </div>

                <p className="text-sm font-semibold">
                  {item.label}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {type && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="mb-7">
            <h2 className="text-base font-semibold">
              2. Enter transaction details
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {selectedType?.label} · {currency}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Field label="Amount" htmlFor="transaction-amount">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-medium text-muted-foreground">
                  $
                </span>

                <input
                  id="transaction-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={amount}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    clearFeedback();
                  }}
                  className={`${INPUT_CLASS} pl-9`}
                  required
                />
              </div>
            </Field>

            <Field label={sourceLabel} htmlFor="source-account">
              <select
                id="source-account"
                value={accountId}
                disabled={isSubmitting}
                onChange={(event) =>
                  changeSource(event.target.value)
                }
                className={INPUT_CLASS}
                required
              >
                <option value="">Select an account</option>

                {sourceAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {getAccountLabel(account)}
                  </option>
                ))}
              </select>
            </Field>

            {needsDestination && (
              <Field
                label={destinationLabel}
                htmlFor="destination-account"
              >
                <select
                  id="destination-account"
                  value={destinationAccountId}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setDestinationAccountId(
                      event.target.value
                    );
                    clearFeedback();
                  }}
                  className={INPUT_CLASS}
                  required
                >
                  <option value="">
                    Select a destination
                  </option>

                  {destinationAccounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {getAccountLabel(account)}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Date" htmlFor="transaction-date">
              <input
                id="transaction-date"
                type="date"
                value={date}
                disabled={isSubmitting}
                onChange={(event) => {
                  setDate(event.target.value);
                  clearFeedback();
                }}
                className={INPUT_CLASS}
                required
              />
            </Field>

            <Field
              label="Description (optional)"
              htmlFor="transaction-description"
              hint="A short note to help you identify this transaction."
            >
              <input
                id="transaction-description"
                type="text"
                maxLength={250}
                placeholder="e.g. Groceries, salary, rent..."
                value={description}
                disabled={isSubmitting}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearFeedback();
                }}
                className={INPUT_CLASS}
              />
            </Field>

            {type === "TRANSFER" && (
              <div className="flex gap-3 rounded-xl bg-accent/50 p-4 text-sm text-muted-foreground">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                />

                <p>
                  Transfers move money between your accounts.
                  They do not count as income or expenses.
                </p>
              </div>
            )}

            {type === "CREDIT_CARD_PAYMENT" && (
              <div className="flex gap-3 rounded-xl bg-accent/50 p-4 text-sm text-muted-foreground">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                />

                <p>
                  Credit card payments reduce your cash
                  balance and outstanding card debt. They
                  are not recorded as new expenses.
                </p>
              </div>
            )}

            {sourceAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No eligible active accounts are available
                for this transaction type.
              </p>
            )}

            {needsDestination &&
              destinationAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No eligible destination accounts are
                  available. Check that you have the
                  required account types.
                </p>
              )}

            {error && (
              <div
                role="alert"
                className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              >
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                <p>{error}</p>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                    Recording...
                  </>
                ) : (
                  `Record ${selectedType?.label}`
                )}
              </button>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Transactions are securely recorded in
                your financial ledger.
              </p>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
