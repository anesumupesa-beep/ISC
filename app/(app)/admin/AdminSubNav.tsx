"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, isAdminNavActive } from "@/lib/admin/nav";

export function AdminSubNav() {
  const pathname = usePathname();
  return (
    <nav className="adm-subnav" aria-label="Committee sections">
      {adminNav.map((item) => {
        const active = isAdminNavActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {item.page}
          </Link>
        );
      })}
    </nav>
  );
}
