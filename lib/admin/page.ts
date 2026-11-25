import "server-only";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/data";

/** Second guard layer: layouts are not re-rendered on every client navigation, so each page checks too. */
export async function guardPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "isc_admin") notFound();
  return viewer;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
