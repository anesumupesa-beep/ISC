import type { AdminNavItem } from "./types";

// Order = sub-nav order. The phone bottom nav shows the first 5; Activity stays reachable from the sub-nav.
export const adminNav: AdminNavItem[] = [
  { page: "Dashboard", href: "/admin", short: "Home", icon: "home" },
  { page: "Housing", href: "/admin/housing", short: "Housing", icon: "housing" },
  { page: "Buddies", href: "/admin/buddies", short: "Buddies", icon: "buddy" },
  { page: "People", href: "/admin/people", short: "People", icon: "globe" },
  { page: "Content", href: "/admin/content", short: "Content", icon: "book" },
  { page: "Activity", href: "/admin/activity", short: "Activity", icon: "clock" },
];

export const isAdminNavActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
