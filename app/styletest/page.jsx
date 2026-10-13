
"use client";

import { useState } from "react";

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);

  function toggleTheme() {
    const nextMode = !darkMode;

    document.documentElement.classList.toggle("dark", nextMode);
    setDarkMode(nextMode);
  }

  return (
    <main className="min-h-screen bg-background px-page py-10">
      <div className="mx-auto max-w-5xl space-y-section">

        {/* Header and Theme Toggle */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              FOLIVO
            </p>

            <h1 className="mt-2 text-page-title font-semibold tracking-tight">
              Financial Overview
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Testing our global design system.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </header>

        {/* Financial Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-xl border border-border bg-card p-card shadow-card">
            <p className="text-sm text-muted-foreground">
              Cash & Bank
            </p>
            <h2 className="mt-3 text-amount font-semibold tabular-nums">
              $8,450.00
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card p-card shadow-card">
            <p className="text-sm text-muted-foreground">
              Monthly Income
            </p>
            <h2 className="mt-3 text-amount font-semibold text-income tabular-nums">
              $3,700.00
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card p-card shadow-card">
            <p className="text-sm text-muted-foreground">
              Monthly Expenses
            </p>
            <h2 className="mt-3 text-amount font-semibold text-expense tabular-nums">
              $1,620.00
            </h2>
          </div>

        </section>

        {/* Component Preview */}
        <section className="rounded-xl border border-border bg-card p-card shadow-card">
          <h2 className="text-lg font-semibold">
            Component Preview
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            All colors update automatically when the theme changes.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Add Transaction
            </button>

            <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
              View Accounts
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}
