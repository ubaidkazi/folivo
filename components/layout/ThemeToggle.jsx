
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={mounted ? isDark : false}
      onClick={handleToggle}
      disabled={!mounted}
      className={`${styles.toggle} ${
        mounted && isDark ? styles.dark : ""
      }`}
      title={
        !mounted
          ? "Loading theme"
          : isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
      }
    >
      <span className={styles.track}>
        <Sun
          size={14}
          className={styles.sunIcon}
          aria-hidden="true"
        />

        <Moon
          size={14}
          className={styles.moonIcon}
          aria-hidden="true"
        />

        <span className={styles.thumb} aria-hidden="true">
          {mounted && isDark ? (
            <Moon size={13} />
          ) : (
            <Sun size={13} />
          )}
        </span>
      </span>
    </button>
  );
}
