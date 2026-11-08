
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  Landmark,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";

import styles from "./onboardingWizard.module.css";

const ACCOUNT_TYPES = [
  {
    type: "CHECKING",
    label: "Checking",
    icon: Landmark,
  },
  {
    type: "SAVINGS",
    label: "Savings",
    icon: Wallet,
  },
  {
    type: "CASH",
    label: "Cash",
    icon: Banknote,
  },
  {
    type: "CREDIT_CARD",
    label: "Credit Card",
    icon: CreditCard,
  },
];

const MAX_ACCOUNTS = 20;
const MAX_CENTS = 99999999999n;

const INITIAL_ACCOUNTS = [
  {
    id: "initial-checking",
    name: "Checking",
    type: "CHECKING",
    openingBalance: "",
  },
  {
    id: "initial-savings",
    name: "Savings",
    type: "SAVINGS",
    openingBalance: "",
  },
];

function parseCents(value) {
  const amount = value.trim();

  if (amount === "") return 0n;

  if (!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(amount)) {
    return null;
  }

  const [dollars, fraction = ""] = amount.split(".");

  const cents =
    BigInt(dollars) * 100n +
    BigInt(fraction.padEnd(2, "0") || "0");

  return cents <= MAX_CENTS ? cents : null;
}

function formatMoney(cents) {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;

  const dollars = absolute / 100n;
  const fraction = (absolute % 100n)
    .toString()
    .padStart(2, "0");

  return `${negative ? "-" : ""}$${dollars.toLocaleString("en-US")}.${fraction}`;
}

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAccountLabel(type) {
  return ACCOUNT_TYPES.find((item) => item.type === type)?.label
    ?? type;
}

export default function OnboardingWizard() {
  const router = useRouter();
  const nextAccountId = useRef(0);

  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState(
    "My Personal Finances"
  );
  const [timeZone, setTimeZone] = useState("");
  const [openingDate, setOpeningDate] = useState("");

  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    );
    setOpeningDate(getLocalDate());
  }, []);

  const totalAssets = accounts.reduce((sum, account) => {
    if (account.type === "CREDIT_CARD") return sum;

    return sum + (parseCents(account.openingBalance) ?? 0n);
  }, 0n);

  const totalLiabilities = accounts.reduce((sum, account) => {
    if (account.type !== "CREDIT_CARD") return sum;

    return sum + (parseCents(account.openingBalance) ?? 0n);
  }, 0n);

  const netWorth = totalAssets - totalLiabilities;

  function addAccount(type) {
    if (accounts.length >= MAX_ACCOUNTS) {
      setError(`You can add up to ${MAX_ACCOUNTS} accounts.`);
      return;
    }

    const baseName = getAccountLabel(type);

    const existingNames = new Set(
      accounts.map((account) => account.name.trim().toLowerCase())
    );

    let name = baseName;
    let number = 2;

    while (existingNames.has(name.toLowerCase())) {
      name = `${baseName} ${number}`;
      number++;
    }

    nextAccountId.current++;

    setAccounts((current) => [
      ...current,
      {
        id: `new-account-${nextAccountId.current}`,
        name,
        type,
        openingBalance: "",
      },
    ]);

    setError("");
  }

  function updateAccount(id, field, value) {
    setAccounts((current) =>
      current.map((account) =>
        account.id === id
          ? { ...account, [field]: value }
          : account
      )
    );

    setError("");
  }

  function removeAccount(id) {
    setAccounts((current) =>
      current.filter((account) => account.id !== id)
    );

    setError("");
  }

  function validateWorkspace() {
    const name = workspaceName.trim();

    if (!name || name.length > 80) {
      return "Workspace name must contain 1–80 characters.";
    }

    if (!timeZone.trim()) {
      return "A valid time zone is required.";
    }

    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone.trim(),
      });
    } catch {
      return "Enter a valid time zone, such as America/Chicago.";
    }

    return null;
  }

  function validateAccounts() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(openingDate)) {
      return "Select a valid opening balance date.";
    }

    const date = new Date(`${openingDate}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== openingDate
    ) {
      return "Select a valid opening balance date.";
    }

    const names = new Set();

    for (const account of accounts) {
      const name = account.name.trim();

      if (!name || name.length > 80) {
        return "Each account needs a name of 1–80 characters.";
      }

      if (names.has(name.toLowerCase())) {
        return "Account names must be unique.";
      }

      names.add(name.toLowerCase());

      if (parseCents(account.openingBalance) === null) {
        return `Enter a valid non-negative balance for ${name}.`;
      }
    }

    return null;
  }

  function goNext() {
    const validationError =
      step === 1 ? validateWorkspace() : validateAccounts();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep((current) => Math.min(current + 1, 3));
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  }

  async function createWorkspace() {
    if (isSubmitting) return;

    const validationError =
      validateWorkspace() || validateAccounts();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          name: workspaceName.trim(),
          currency: "USD",
          timeZone: timeZone.trim(),
          openingDate,
          accounts: accounts.map((account) => ({
            name: account.name.trim(),
            type: account.type,
            openingBalance: account.openingBalance.trim(),
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to create your workspace."
        );
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>
              <Wallet size={20} />
            </span>
            <span>Folivo</span>
          </div>

          <span className={styles.headerNote}>
            Personal finance setup
          </span>
        </header>

        <main className={styles.main}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>
              GETTING STARTED
            </span>

            <h1>Make your money make sense.</h1>

            <p>
              Set up your financial space in a few simple
              steps. You'll be ready to track everything
              in one place.
            </p>
          </div>

          <nav
            className={styles.progress}
            aria-label="Onboarding progress"
          >
            {["Workspace", "Accounts", "Review"].map(
              (label, index) => {
                const number = index + 1;
                const completed = number < step;
                const active = number === step;

                return (
                  <div
                    key={label}
                    className={`${styles.progressItem} ${
                      active ? styles.progressActive : ""
                    } ${
                      completed ? styles.progressCompleted : ""
                    }`}
                    aria-current={active ? "step" : undefined}
                  >
                    <span className={styles.progressNumber}>
                      {completed ? <Check size={15} /> : number}
                    </span>
                    <span>{label}</span>
                  </div>
                );
              }
            )}
          </nav>

          <section className={styles.panel}>
            {step === 1 && (
              <div className={styles.stepContent}>
                <div className={styles.stepHeading}>
                  <div className={styles.stepIcon}>
                    <Wallet size={22} />
                  </div>
                  <h2>Let's create your workspace</h2>
                  <p>
                    This is your personal space for managing
                    accounts, transactions, and finances.
                  </p>
                </div>

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="workspace-name">
                      Workspace name
                    </label>

                    <input
                      id="workspace-name"
                      type="text"
                      maxLength={80}
                      value={workspaceName}
                      onChange={(event) => {
                        setWorkspaceName(event.target.value);
                        setError("");
                      }}
                      placeholder="My Personal Finances"
                    />

                    <span className={styles.hint}>
                      You can change this later.
                    </span>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="currency">
                      Currency
                    </label>

                    <input
                      id="currency"
                      value="USD — US Dollar"
                      disabled
                      readOnly
                    />

                    <span className={styles.hint}>
                      Additional currencies will be supported
                      in a future update.
                    </span>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="time-zone">
                      Time zone
                    </label>

                    <input
                      id="time-zone"
                      value={timeZone}
                      onChange={(event) => {
                        setTimeZone(event.target.value);
                        setError("");
                      }}
                      placeholder="America/Chicago"
                    />

                    <span className={styles.hint}>
                      Automatically detected. Used for dates
                      and financial reporting.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.stepContent}>
                <div className={styles.stepHeading}>
                  <div className={styles.stepIcon}>
                    <Landmark size={22} />
                  </div>
                  <h2>Add your financial accounts</h2>
                  <p>
                    Start with the accounts you use today.
                    You can always add more later.
                  </p>
                </div>

                <div className={styles.field}>
                  <label htmlFor="opening-date">
                    Opening balance date
                  </label>

                  <input
                    id="opening-date"
                    type="date"
                    value={openingDate}
                    onChange={(event) => {
                      setOpeningDate(event.target.value);
                      setError("");
                    }}
                  />

                  <span className={styles.hint}>
                    The date your starting balances apply to.
                  </span>
                </div>

                <div className={styles.accountSection}>
                  <div className={styles.sectionHeading}>
                    <h3>Your accounts</h3>
                    <span>
                      {accounts.length} / {MAX_ACCOUNTS}
                    </span>
                  </div>

                  {accounts.length === 0 && (
                    <div className={styles.emptyAccounts}>
                      No accounts added yet. You can add one
                      below or continue with an empty workspace.
                    </div>
                  )}

                  {accounts.map((account) => {
                    const config = ACCOUNT_TYPES.find(
                      (item) => item.type === account.type
                    );

                    const Icon = config?.icon ?? Wallet;

                    return (
                      <div
                        key={account.id}
                        className={styles.accountCard}
                      >
                        <div className={styles.accountCardTop}>
                          <div className={styles.accountIdentity}>
                            <span className={styles.accountIcon}>
                              <Icon size={18} />
                            </span>

                            <span className={styles.accountType}>
                              {getAccountLabel(account.type)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => removeAccount(account.id)}
                            aria-label={`Remove ${account.name}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className={styles.accountFields}>
                          <div className={styles.field}>
                            <label htmlFor={`name-${account.id}`}>
                              Account name
                            </label>

                            <input
                              id={`name-${account.id}`}
                              type="text"
                              maxLength={80}
                              value={account.name}
                              onChange={(event) =>
                                updateAccount(
                                  account.id,
                                  "name",
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          <div className={styles.field}>
                            <label htmlFor={`balance-${account.id}`}>
                              {account.type === "CREDIT_CARD"
                                ? "Current amount owed"
                                : "Opening balance"}
                            </label>

                            <div className={styles.moneyInput}>
                              <span>$</span>
                              <input
                                id={`balance-${account.id}`}
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={account.openingBalance}
                                onChange={(event) =>
                                  updateAccount(
                                    account.id,
                                    "openingBalance",
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.addSection}>
                  <h3>Add another account</h3>

                  <div className={styles.accountTypes}>
                    {ACCOUNT_TYPES.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.type}
                          type="button"
                          className={styles.addAccountButton}
                          onClick={() => addAccount(item.type)}
                          disabled={accounts.length >= MAX_ACCOUNTS}
                        >
                          <Icon size={19} />
                          <span>{item.label}</span>
                          <Plus size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.stepContent}>
                <div className={styles.stepHeading}>
                  <div className={styles.stepIcon}>
                    <CheckCircle2 size={22} />
                  </div>
                  <h2>Review your financial setup</h2>
                  <p>
                    Make sure everything looks right before
                    creating your workspace.
                  </p>
                </div>

                <div className={styles.reviewSection}>
                  <div className={styles.reviewHeading}>
                    <h3>Workspace</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setStep(1);
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  <div className={styles.reviewRows}>
                    <div>
                      <span>Name</span>
                      <strong>{workspaceName.trim()}</strong>
                    </div>
                    <div>
                      <span>Currency</span>
                      <strong>USD</strong>
                    </div>
                    <div>
                      <span>Time zone</span>
                      <strong>{timeZone}</strong>
                    </div>
                    <div>
                      <span>Opening date</span>
                      <strong>{openingDate}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <div className={styles.reviewHeading}>
                    <h3>Financial accounts</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setStep(2);
                      }}
                    >
                      Edit
                    </button>
                  </div>

                  {accounts.length === 0 ? (
                    <p className={styles.emptyReview}>
                      No initial accounts. You can add them later.
                    </p>
                  ) : (
                    <div className={styles.reviewAccounts}>
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          className={styles.reviewAccount}
                        >
                          <div>
                            <strong>{account.name.trim()}</strong>
                            <span>
                              {getAccountLabel(account.type)}
                            </span>
                          </div>

                          <strong>
                            {formatMoney(
                              parseCents(account.openingBalance) ?? 0n
                            )}
                            {account.type === "CREDIT_CARD"
                              ? " owed"
                              : ""}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.summary}>
                  <h3>Starting financial overview</h3>

                  <div className={styles.summaryRow}>
                    <span>Total assets</span>
                    <strong>{formatMoney(totalAssets)}</strong>
                  </div>

                  <div className={styles.summaryRow}>
                    <span>Total liabilities</span>
                    <strong>{formatMoney(totalLiabilities)}</strong>
                  </div>

                  <div className={styles.netWorth}>
                    <span>Starting net worth</span>
                    <strong>{formatMoney(netWorth)}</strong>
                  </div>
                </div>

                <div className={styles.securityNote}>
                  <ShieldCheck size={19} />
                  <p>
                    Your opening balances will be recorded
                    using Folivo's double-entry ledger.
                    They won't be counted as income or expenses.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <footer className={styles.actions}>
              {step > 1 ? (
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={goBack}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={17} />
                  Back
                </button>
              ) : (
                <span />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={goNext}
                >
                  Continue
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={createWorkspace}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className={styles.spinner}
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      Create Workspace
                    </>
                  )}
                </button>
              )}
            </footer>
          </section>

          <p className={styles.footerNote}>
            Your finances, organized your way.
          </p>
        </main>
      </div>
    </div>
  );
}
