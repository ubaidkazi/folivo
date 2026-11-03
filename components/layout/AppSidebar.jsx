
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Wallet,
  LockKeyhole,
} from "lucide-react";
import {
  navigationItems,
  settingsNavigationItem,
  isActiveRoute,
} from "./navigation";
import styles from "./AppSidebar.module.css";



export default function AppSidebar() {
  const pathname = usePathname();

  const SettingsIcon = settingsNavigationItem.icon;
  

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
          <SettingsIcon size={19} aria-hidden="true" />
          <span>{settingsNavigationItem.label}</span>
          <LockKeyhole
            size={14}
            className={styles.lockIcon}
            aria-hidden="true"
          />
        </span>
      </div>
    </aside>
  );
}
