
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ChartPie,
  ChartNoAxesColumn,
  Settings,
  LockKeyhole,
} from "lucide-react";

import styles from "./AppSidebar.module.css";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    label: "Accounts",
    href: "/accounts",
    icon: Wallet,
    enabled: true,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
    enabled: true,
  },
  {
    label: "Budgets",
    href: "/budgets",
    icon: ChartPie,
    enabled: true,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ChartNoAxesColumn,
    enabled: false,
  },
];

function isActiveRoute(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar} aria-label="Application sidebar">
      <Link href="/dashboard" className={styles.brand}>
        <span className={styles.brandIcon}>
          <Wallet size={23} strokeWidth={2} />
        </span>

        <span className={styles.brandText}>
          <span className={styles.brandName}>Folivo</span>
          <span className={styles.brandSubtitle}>Personal finance</span>
        </span>
      </Link>

      <nav className={styles.navigation} aria-label="Main navigation">
        <span className={styles.sectionLabel}>Workspace</span>

        <ul className={styles.navList}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);

            return (
              <li key={item.href}>
                {item.enabled ? (
                  <Link
                    href={item.href}
                    className={`${styles.navItem} ${
                      active ? styles.navItemActive : ""
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={`${styles.navItem} ${styles.navItemDisabled}`}
                    aria-disabled="true"
                    title={`${item.label} is coming soon`}
                  >
                    <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>

                    <LockKeyhole
                      size={13}
                      className={styles.lockIcon}
                      aria-hidden="true"
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <span
          className={`${styles.navItem} ${styles.navItemDisabled}`}
          aria-disabled="true"
          title="Settings is coming soon"
        >
          <Settings size={19} strokeWidth={1.9} aria-hidden="true" />
          <span>Settings</span>

          <LockKeyhole
            size={13}
            className={styles.lockIcon}
            aria-hidden="true"
          />
        </span>
      </div>
    </aside>
  );
}
