
"use client";

import { ChevronDown, Settings, LogOut } from "lucide-react";
import styles from "./UserMenu.module.css";

function getInitials(name) {
  if (!name?.trim()) return "U";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default function UserMenu({ user }) {
  const displayName = user?.name || user?.email || "User";
  const initials = getInitials(user?.name);

  return (
    <details className={styles.menu}>
      <summary className={styles.trigger}>
        <span className={styles.avatar} aria-hidden="true">
          {initials}
        </span>

        <span className={styles.triggerInformation}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>My account</span>
        </span>

        <ChevronDown
          size={16}
          className={styles.chevron}
          aria-hidden="true"
        />
      </summary>

      <div className={styles.dropdown}>
        <div className={styles.dropdownHeader}>
          <span className={styles.dropdownName}>
            {user?.name || "Folivo user"}
          </span>

          <span className={styles.dropdownEmail}>
            {user?.email}
          </span>
        </div>

        <div className={styles.dropdownDivider} />

        <div className={styles.dropdownActions}>
          <span
            className={`${styles.dropdownItem} ${styles.disabledItem}`}
            aria-disabled="true"
            title="Settings is coming soon"
          >
            <Settings size={17} aria-hidden="true" />
            <span>Settings</span>
          </span>

          <span
            className={`${styles.dropdownItem} ${styles.disabledItem}`}
            aria-disabled="true"
            title="Sign out will be implemented in Step 7.4"
          >
            <LogOut size={17} aria-hidden="true" />
            <span>Sign out</span>
          </span>
        </div>
      </div>
    </details>
  );
}
