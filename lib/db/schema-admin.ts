import { index, uniqueIndex, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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

// Owner-issued admin invites. Only a SHA-256 hash of the token is stored; the link is shown to the owner once.
export const adminInvites = pgTable("admin_invites", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(), // lower-cased; only the signed-in user with this email can accept
  tokenHash: text("token_hash").notNull(),
  invitedBy: text("invited_by").notNull(),
  invitedByName: text("invited_by_name").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("admin_invites_token_idx").on(t.tokenHash)]);
