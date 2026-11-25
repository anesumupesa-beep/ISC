import { sql } from "drizzle-orm";
import {
  boolean, date, integer, pgEnum, pgSequence, pgTable, primaryKey, serial, text, timestamp,
} from "drizzle-orm/pg-core";
import { publishing } from "./cms-schema";

export * from "./schema-admin";
export * from "./cms-schema";

export const role = pgEnum("role", ["student", "isc_admin", "welfare_staff"]);
export const updateCategory = pgEnum("update_category", [
  "Official Announcements", "Events", "Weather & Holidays", "ISC Membership",
]);
export const enquiryStatus = pgEnum("enquiry_status", ["Submitted", "Acknowledged", "Referred to Counsellor"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// user_id columns hold the Neon Auth user id (neon_auth.user.id); no FK since Neon manages that schema.
export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  role: role("role").notNull().default("student"),
  name: text("name").notNull(),
  country: text("country"),
  programme: text("programme"),
  createdAt: createdAt(),
});

// CMS-created tasks take ids from this sequence; seeded ids 1 to 8 are untouched.
export const arrivalTaskSeq = pgSequence("arrival_task_seq", { startWith: 1000 });

export const arrivalTasks = pgTable("arrival_tasks", {
  id: integer("id").primaryKey().default(sql`nextval('arrival_task_seq')`),
  section: integer("section").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  documents: text("documents").notNull(),
  link: text("link").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  isSample: boolean("is_sample").notNull().default(false),
  ...publishing(),
});

export const arrivalProgress = pgTable("arrival_progress", {
  userId: text("user_id").notNull(),
  taskId: integer("task_id").notNull().references(() => arrivalTasks.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.taskId] })]);

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  area: text("area").notNull(),
  type: text("type").notNull(),
  price: integer("price").notNull(),
  walk: text("walk").notNull(),
  includes: text("includes").notNull(),
  checkedAt: date("checked_at").notNull(),
  contact: text("contact"),
  isSample: boolean("is_sample").notNull().default(false),
  ...publishing(),
});

export const housingReports = pgTable("housing_reports", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  userId: text("user_id"), // null for seed rows
  reason: text("reason").notNull(),
  note: text("note").notNull().default(""),
  photoKey: text("photo_key"), // object key in the "uploads" bucket
  resolved: boolean("resolved").notNull().default(false),
  outcome: text("outcome"), // null until resolved: "verified" | "dismissed" (legacy rows stay null)
  resolutionNote: text("resolution_note"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const clubUpdates = pgTable("club_updates", {
  id: serial("id").primaryKey(),
  category: updateCategory("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  meta: text("meta").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  publishedBy: text("published_by"),
  createdAt: createdAt(),
  eventAt: timestamp("event_at", { withTimezone: true }),
  venue: text("venue"),
  linkLabel: text("link_label"),
  linkUrl: text("link_url"),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvalRef: text("approval_ref"),
  isSample: boolean("is_sample").notNull().default(false),
  ...publishing(),
});

export const rsvps = pgTable("rsvps", {
  userId: text("user_id").notNull(),
  updateId: integer("update_id").notNull().references(() => clubUpdates.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.userId, t.updateId] })]);

export const memberships = pgTable("memberships", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  programme: text("programme"),
  createdAt: createdAt(),
});

export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  userId: text("user_id").unique(),
  name: text("name").notNull(),
  course: text("course").notNull(),
  languages: text("languages").notNull(),
  email: text("email").notNull(),
  capacity: integer("capacity").notNull().default(1),
  year: text("year").notNull().default(""),
  approvedAt: timestamp("approved_at", { withTimezone: true }), // null = pending
  approvedBy: text("approved_by"),
  paused: boolean("paused").notNull().default(false),
});

export const buddyRequests = pgTable("buddy_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  country: text("country").notNull(),
  language: text("language").notNull(),
  arrival: date("arrival").notNull(),
  programme: text("programme").notNull(),
  help: text("help").array().notNull().default(sql`'{}'::text[]`),
  volunteerId: integer("volunteer_id").references(() => volunteers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  assignedBy: text("assigned_by"),
  closedAt: timestamp("closed_at", { withTimezone: true }), // closed requests free up capacity
});

// Seed enquiry is WLF-2026-014, so new ones continue at 015.
// shortcut: the counter never resets per year, add a per-year counter if that matters.
export const welfareEnquirySeq = pgSequence("welfare_enquiry_seq", { startWith: 15 });

export const welfareEnquiries = pgTable("welfare_enquiries", {
  id: text("id").primaryKey().default(
    sql`'WLF-' || to_char(now() at time zone 'Indian/Mauritius', 'YYYY') || '-' || lpad(nextval('welfare_enquiry_seq')::text, 3, '0')`,
  ),
  userId: text("user_id"),
  category: text("category").notNull(),
  urgency: text("urgency").notNull(),
  description: text("description").notNull(),
  contact: text("contact").notNull(),
  status: enquiryStatus("status").notNull().default("Submitted"),
  createdAt: createdAt(),
});
