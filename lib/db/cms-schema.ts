import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contentStatus = pgEnum("content_status", ["draft", "pending_approval", "published", "archived"]);

/** Spread into arrival_tasks, listings, club_updates, resource_links. */
export const publishing = () => ({
  status: contentStatus("status").notNull().default("published"), // legacy rows/inserts stay visible
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"), // Neon Auth user id
});

export const sitePages = pgTable("site_pages", {
  key: text("key").primaryKey(), // 'about' | 'privacy' | 'contact' (validated in code)
  title: text("title").notNull(),
  heading: text("heading").notNull(),
  body: text("body").notNull(),
  linkLabel: text("link_label"),
  linkUrl: text("link_url"),
  status: contentStatus("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

export const resourceLinks = pgTable("resource_links", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  ...publishing(),
});

export const contentRevisions = pgTable("content_revisions", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'arrival_task'|'listing'|'update'|'link'|'page'
  entityId: text("entity_id").notNull(),
  version: integer("version").notNull(),
  action: text("action").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  changedFields: text("changed_fields").array().notNull().default(sql`'{}'::text[]`),
  changedBy: text("changed_by").notNull(),
  changedByName: text("changed_by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("content_revisions_entity_idx").on(t.entityType, t.entityId, t.createdAt)]);

export const contentMedia = pgTable("content_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // content/listing/<uuid>.<ext>
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  alt: text("alt").notNull().default(""),
  entityType: text("entity_type"), // null until attached
  entityId: text("entity_id"),
  position: integer("position").notNull().default(0),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  detachedAt: timestamp("detached_at", { withTimezone: true }),
}, (t) => [index("content_media_entity_idx").on(t.entityType, t.entityId)]);
