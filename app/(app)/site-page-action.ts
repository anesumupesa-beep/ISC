"use server";
import { getSitePages } from "@/lib/cms/read";
import { getViewer } from "@/lib/data";
import type { SitePage } from "@/lib/types";

/** Committee members get the About/Privacy text on demand, so it never sits in the committee pages' HTML. */
export async function loadSitePage(key: "about" | "privacy" | "contact"): Promise<SitePage | null> {
  if (!(await getViewer())) return null;
  return (await getSitePages())[key] ?? null;
}
