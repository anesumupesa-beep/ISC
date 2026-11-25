import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Append-only by convention: no update/delete code path. Never store welfare content here.
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id").notNull(), // Neon Auth user id, or "cli"
  actorName: text("actor_name").notNull(), // snapshot: committee members change yearly
  actorRole: text("actor_role").notNull(), // "isc_admin" | "operator"
  action: text("action").notNull(), // "<domain>.<verb>", e.g. "housing.verify"
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary").notNull(), // one plain sentence, <= 200 chars
  detail: jsonb("detail").$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_log_created_idx").on(t.createdAt.desc()),
  index("audit_log_entity_idx").on(t.entityType, t.entityId),
  index("audit_log_actor_idx").on(t.actorId),
]);
