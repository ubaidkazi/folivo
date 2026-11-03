
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ChartPie,
  ChartNoAxesColumn,
  Settings,
} from "lucide-react";

export const navigationItems = [
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
];

export const settingsNavigationItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
  enabled: false,
};

export const mobileNavigationItems = [
  ...navigationItems,
  settingsNavigationItem,
];

export function isActiveRoute(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
