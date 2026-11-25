"use server";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { auditEntry } from "./audit";
import { runBatch } from "./batch";
import { adminGate } from "./guard";
import { fail, revalidate } from "./util";

const GRANTABLE = ["student", "isc_admin"];

/** Only student <-> isc_admin can be changed here; every other role stays operator-only. */
export async function setUserRole(userId: string, role: "student" | "isc_admin"): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (typeof userId !== "string" || !userId || userId.length > 100) return fail("Invalid user.");
  if (!GRANTABLE.includes(role)) return fail("That role is managed by the platform operator.");
  if (userId === g.viewer.userId) return fail("You can't change your own role.");
  const [target] = await db.select({ name: profiles.name, role: profiles.role }).from(profiles).where(eq(profiles.userId, userId));
  if (!target) return fail("That user no longer exists.");
  if (!GRANTABLE.includes(target.role)) return fail("That role is managed by the platform operator.");
  if (target.role === role) return fail("They already have that role.");
  const { viewer } = g;
  await runBatch([
    db.update(profiles).set({ role }).where(eq(profiles.userId, userId)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "user", entityId: userId,
      action: "user.role_change", summary: `Changed ${target.name} from ${target.role} to ${role}`,
      detail: { from: target.role, to: role },
    }),
  ]);
  revalidate("/admin", "/admin/people", "/admin/activity");
  return { ok: true, message: `${target.name} is now ${role === "isc_admin" ? "an ISC Admin" : "a Student"}.` };
}
