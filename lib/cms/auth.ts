import "server-only";
import { adminGate } from "@/lib/admin/guard";
import type { ActionResult, Viewer } from "@/lib/types";

/** CMS actions: `const a = await requireAdmin(); if ("error" in a) return a.error;` */
export async function requireAdmin(): Promise<{ viewer: Viewer } | { error: ActionResult }> {
  const g = await adminGate();
  return g.ok ? { viewer: g.viewer } : { error: g.result };
}
