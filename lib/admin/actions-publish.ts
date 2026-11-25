"use server";
import { logAudit } from "./audit";
import { adminGate } from "./guard";
import { text } from "./util";

// Temporary: publishUpdate (app/actions.ts) is outside this scope, so its audit row is written right after it.
// Not atomic with the insert; the CMS replaces both with content.* entries.
export async function logUpdatePublished(category: string, title: string): Promise<void> {
  const g = await adminGate();
  if (!g.ok) return;
  const t = text(title, 120) ?? "an update";
  await logAudit({
    actorId: g.viewer.userId, actorName: g.viewer.name, entityType: "update",
    action: "update.publish", summary: `Published "${t}" (${text(category, 40) ?? "update"})`.slice(0, 200),
  });
}
