"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTION_LABEL } from "@/lib/cms/types";

const items = [["", "Overview"], ...Object.entries(SECTION_LABEL)] as [string, string][];

export function ContentNav() {
  const pathname = usePathname();
  return (
    <nav className="cms-nav" aria-label="Content sections">
      {items.map(([section, label]) => {
        const href = section ? `/admin/content/${section}` : "/admin/content";
        const active = section ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
        return (
          <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
