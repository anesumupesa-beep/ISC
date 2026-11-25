import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";

// Copies of the private helpers in app/actions.ts (not exported there on purpose).
// No "use server" and no "server-only" needed: pure helpers, never endpoints.
export const fail = (error: string): ActionResult => ({ ok: false, error });
export const SIGNED_OUT = fail("Please sign in to continue.");
export const FORBIDDEN = fail("You don't have permission to do that.");

/** Trimmed string within [min, max] chars, else null. */
export function text(v: unknown, max: number, min = 1): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
}
export const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
export const revalidate = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));
