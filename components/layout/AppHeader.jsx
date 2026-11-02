
"use client";

import { usePathname } from "next/navigation";

import MobileNavigation from "./MobileNavigation";
import UserMenu from "./UserMenu";

import styles from "./AppHeader.module.css";

const pageInformation = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your financial overview at a glance.",
  },
  accounts: {
    title: "Accounts",
    subtitle: "Manage your financial accounts.",
  },
  transactions: {
    title: "Transactions",
    subtitle: "Track your income, expenses, and transfers.",
  },
  budgets: {
    title: "Budgets",
    subtitle: "Plan and monitor your spending.",
  },
  reports: {
    title: "Reports",
    subtitle: "Understand your financial activity.",
  },
  settings: {
    title: "Settings",
    subtitle: "Manage your preferences.",
  },
};

export default function AppHeader({ user }) {
  const pathname = usePathname();

  const routeSegment = pathname.split("/").filter(Boolean)[0];

  const page = pageInformation[routeSegment] ?? {
    title: "Folivo",
    subtitle: "Your personal finance workspace.",
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <MobileNavigation />

        <div className={styles.pageInformation}>
          <h1 className={styles.pageTitle}>{page.title}</h1>
          <p className={styles.pageSubtitle}>{page.subtitle}</p>
        </div>
      </div>

      <div className={styles.headerActions}>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
