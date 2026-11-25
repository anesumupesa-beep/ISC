import type { AdminNavItem } from "./types";

// Order = sub-nav order. The CMS builder owns the Content entry and may retire Publish.
export const adminNav: AdminNavItem[] = [
  { page: "Dashboard", href: "/admin", short: "Home", icon: "home" },
  { page: "Housing", href: "/admin/housing", short: "Housing", icon: "housing" },
  { page: "Buddies", href: "/admin/buddies", short: "Buddies", icon: "buddy" },
  { page: "People", href: "/admin/people", short: "People", icon: "globe" },
  { page: "Activity", href: "/admin/activity", short: "Activity", icon: "clock" },
  { page: "Publish", href: "/admin/publish", short: "Publish", icon: "updates" }, // temporary, CMS replaces it
  { page: "Content", href: "/admin/content", short: "Content", icon: "book" },
];

export const isAdminNavActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
