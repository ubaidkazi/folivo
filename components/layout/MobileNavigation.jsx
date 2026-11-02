
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Menu,
  X,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ChartPie,
  ChartNoAxesColumn,
  Settings,
  LockKeyhole,
} from "lucide-react";

import styles from "./MobileNavigation.module.css";

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
    enabled: false,
  },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
    enabled: false,
  },
  {
    label: "Budgets",
    href: "/budgets",
    icon: ChartPie,
    enabled: false,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ChartNoAxesColumn,
    enabled: false,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    enabled: false,
  },
];

function isActiveRoute(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileNavigation() {
  const pathname = usePathname();

  const dialogRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  function openSheet() {
    const dialog = dialogRef.current;

    if (!dialog || dialog.open) return;

    dialog.showModal();
    setIsOpen(true);
    setIsClosing(false);
  }

  function closeSheet() {
    const dialog = dialogRef.current;

    if (!dialog?.open || isClosing) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      return;
    }

    setIsClosing(true);
  }

  function handleAnimationEnd(event) {
    if (event.target !== event.currentTarget) return;

    if (isClosing) {
      dialogRef.current?.close();
    }
  }

  function handleBackdropClick(event) {
    if (event.target !== event.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (outside) {
      closeSheet();
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        onClick={openSheet}
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Menu size={22} strokeWidth={2} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        className={`${styles.sheet} ${
          isClosing ? styles.closing : ""
        }`}
        aria-labelledby="mobile-navigation-title"
        onCancel={(event) => {
          event.preventDefault();
          closeSheet();
        }}
        onClose={() => {
          setIsOpen(false);
          setIsClosing(false);
        }}
        onClick={handleBackdropClick}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className={styles.handle} aria-hidden="true" />

        <div className={styles.sheetHeader}>
          <div className={styles.sheetHeading}>
            <h2
              id="mobile-navigation-title"
              className={styles.sheetTitle}
            >
              Navigation
            </h2>

            <p className={styles.sheetSubtitle}>
              Explore your workspace
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closeSheet}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile navigation">
          <ul className={styles.navigationGrid}>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveRoute(pathname, item.href);

              return (
                <li key={item.href}>
                  {item.enabled ? (
                    <Link
                      href={item.href}
                      onClick={closeSheet}
                      className={`${styles.navigationItem} ${
                        active ? styles.navigationItemActive : ""
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        size={23}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />

                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <div
                      className={`${styles.navigationItem} ${styles.disabledItem}`}
                      aria-disabled="true"
                      title={`${item.label} is coming soon`}
                    >
                      <Icon
                        size={23}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />

                      <span>{item.label}</span>

                      <LockKeyhole
                        size={12}
                        className={styles.lockIcon}
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <p className={styles.footerText}>
          More features coming soon
        </p>
      </dialog>
    </>
  );
}
