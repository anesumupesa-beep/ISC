import "server-only";
import { getViewer } from "@/lib/data";
import type { ActionResult, Viewer } from "@/lib/types";
import { FORBIDDEN, SIGNED_OUT } from "./util";

/** For actions and route handlers: `const g = await adminGate(); if (!g.ok) return g.result;` */
export async function adminGate(): Promise<{ ok: true; viewer: Viewer } | { ok: false; result: ActionResult }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, result: SIGNED_OUT };
  if (viewer.role !== "isc_admin") return { ok: false, result: FORBIDDEN };
  return { ok: true, viewer };
}

/** For data functions: throws unless the viewer is an ISC admin. Never put "use server" in a file that exports this. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer?.role !== "isc_admin") throw new Error("Forbidden");
  return viewer;
}
