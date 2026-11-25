"use server";
import { requireAdmin } from "@/lib/cms/auth";
import * as lifecycle from "@/lib/cms/lifecycle";
import * as links from "@/lib/cms/links";
import * as listings from "@/lib/cms/listings";
import * as media from "@/lib/cms/media";
import * as pages from "@/lib/cms/pages";
import * as tasks from "@/lib/cms/tasks";
import * as updates from "@/lib/cms/updates";
import type { CmsResult } from "@/lib/cms/types";
import { fail } from "@/lib/cms/util";

// Every export starts with requireAdmin() (a CI-style test greps for it). Logic and validation live in lib/cms/*.
// Thrown errors are turned into a generic failure: never leak SQL to the client.

export async function saveTask(input: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return tasks.saveTask(a.viewer, input).catch(failed);
}
export async function moveTask(id: unknown, dir: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return tasks.moveTask(a.viewer, id, dir).catch(failed);
}
export async function saveListing(input: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return listings.saveListing(a.viewer, input).catch(failed);
}
export async function verifyListing(id: unknown, version: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return listings.verifyListingCms(a.viewer, id, version).catch(failed);
}
export async function uploadContentImage(form: FormData): Promise<CmsResult & { url?: string }> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return media.uploadImage(a.viewer, form).catch(failed);
}
export async function saveUpdate(input: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return updates.saveUpdate(a.viewer, input).catch(failed);
}
export async function submitForApproval(id: unknown, version: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return updates.submitForApproval(a.viewer, id, version).catch(failed);
}
export async function approveUpdate(id: unknown, version: unknown, approvalRef: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return updates.approveUpdate(a.viewer, id, version, approvalRef).catch(failed);
}
export async function saveLink(input: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return links.saveLink(a.viewer, input).catch(failed);
}
export async function saveSitePage(input: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return pages.savePage(a.viewer, input).catch(failed);
}
export async function setStatus(type: unknown, id: unknown, version: unknown, status: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return lifecycle.setStatus(a.viewer, type, id, version, status).catch(failed);
}
export async function deleteContent(type: unknown, id: unknown, version: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return lifecycle.deleteContent(a.viewer, type, id, version).catch(failed);
}
export async function restoreDeleted(type: unknown, id: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return lifecycle.restoreDeleted(a.viewer, type, id).catch(failed);
}
export async function restoreRevision(revisionId: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return lifecycle.restoreRevision(a.viewer, revisionId).catch(failed);
}
export async function markSampleReal(type: unknown, id: unknown, version: unknown): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return lifecycle.markSampleReal(a.viewer, type, id, version).catch(failed);
}
export async function archiveAllSamples(): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return lifecycle.archiveAllSamples(a.viewer).catch(failed);
}
export async function sweepMedia(): Promise<CmsResult> {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return media.sweepMedia(a.viewer).catch(failed);
}

// Not exported: a "use server" file may only export async functions.
function failed(e: unknown): CmsResult {
  console.error("cms action failed", e);
  return fail("Something went wrong. Nothing was changed. Try again.");
}
