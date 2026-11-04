
"use client";

import { useEffect, useRef, useState } from "react";

import {
  ChevronDown,
  Settings,
  LogOut,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";

import styles from "./UserMenu.module.css";

const LOGOUT_STORAGE_KEY = "folivo:logout";

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
  const menuRef = useRef(null);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  // Close the dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    function handlePointerDown(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        menuRef.current.open = false;
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false;

        menuRef.current
          .querySelector("summary")
          ?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  // Respond when another Folivo tab signs out.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === LOGOUT_STORAGE_KEY && event.newValue) {
        window.location.replace("/login");
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setError("");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        throw new Error(
          result.error.message || "Unable to sign out."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );

      setIsSigningOut(false);
      return;
    }

    // Logout has succeeded. Notify other open tabs.
    try {
      localStorage.setItem(
        LOGOUT_STORAGE_KEY,
        String(Date.now())
      );
    } catch {
      // Browser storage may be unavailable.
      // The successful logout should still redirect.
    }

    // Perform a full navigation to clear the current app UI.
    window.location.replace("/login");
  }

  return (
    <details ref={menuRef} className={styles.menu}>
      <summary
        className={styles.trigger}
        aria-label={`Account menu for ${user?.name || "user"}`}
      >
        <div className={styles.avatar}>
          {getInitials(user?.name)}
        </div>

        <div className={styles.triggerInformation}>
          <span className={styles.triggerName}>
            {user?.name || "User"}
          </span>

          <span className={styles.triggerSubtitle}>
            My account
          </span>
        </div>

        <ChevronDown
          size={16}
          className={styles.chevron}
          aria-hidden="true"
        />
      </summary>

      <div className={styles.dropdown}>
        <div className={styles.accountInformation}>
          <span className={styles.accountName}>
            {user?.name || "User"}
          </span>

          <span className={styles.accountEmail}>
            {user?.email}
          </span>
        </div>

        <div className={styles.menuDivider} />

        <div
          className={`${styles.menuItem} ${styles.disabledItem}`}
          aria-disabled="true"
          title="Settings is coming soon"
        >
          <Settings size={17} aria-hidden="true" />
          <span>Settings</span>
        </div>

        <div className={styles.menuDivider} />

        <button
          type="button"
          className={`${styles.menuItem} ${styles.signOutButton}`}
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <LogOut size={17} aria-hidden="true" />

          <span>
            {isSigningOut ? "Signing out..." : "Sign Out"}
          </span>
        </button>

        {error && (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
