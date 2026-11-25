# ISC Connect: In-app CMS plan

Status: plan only (no code written). Author: CMS planner. Companion: `docs/plans/admin-console.md` (admin shell, audit log; see section 12).
Spec anchors (ISC_Connect_Refined.pptx): slide 4 (arrival guide, housing with last-checked dates + reporting, club updates = events/announcements/membership), slide 7 ("obtain UTM approval before publishing official information", "show a last-checked date on housing details", plain mobile-first content, "continuity: club-owned accounts and documentation so the platform survives committee changes"), slide 6 (role permissions, committee handover).

---

## 1. Audit: is there a CMS today?

**Verdict: no CMS.** The only editing capability is "publish a club update" (insert-only). Everything else is seed data changeable only by SQL or by editing `scripts/seed.ts` and re-running it (seed uses `onConflictDoNothing`, so even editing the seed file does NOT change existing rows; it needs raw SQL).

| Content | Where it lives | How it is changed today | Evidence |
|---|---|---|---|
| Arrival **stages** (4 names) | hard-coded array `arrivalSections` | code change + deploy | `lib/ui.ts:15-20` |
| Arrival **tasks** (8) | `arrival_tasks` (id, section, title, detail, documents, link, url) | seed/SQL only. No order column (`orderBy id`), no status, `id` is a manual integer PK (no sequence), FK from `arrival_progress` is `onDelete cascade` so a hard delete wipes every student's progress | `lib/db/schema.ts:24-37`, `lib/data.ts:257-260`, `scripts/seed.ts:7-83,106` |
| **Housing listings** (12) | `listings` (title, area, type, price, walk, includes, checked_at) | seed/SQL, plus `verifyListing` which only sets `checked_at = today` and resolves reports. No create/edit/unpublish/delete, no status, no contact field although the report reason is "Contact unreachable", no photos | `lib/db/schema.ts:39-48`, `app/actions.ts:73-87`, `scripts/seed.ts:85-98` |
| Filter lists (areas, budgets, room types) | hard-coded | code change | `lib/ui.ts:22-31` |
| **Club updates** | `club_updates` (category, title, description, meta, pinned, published_by, created_at) | `publishUpdate` (isc_admin) = INSERT only; `meta` is hard-coded "ISC Committee · Just published"; `pinned` forced true for Weather & Holidays. No edit, unpublish, delete, schedule, draft, event date/venue (events show the *created* date as the date tile), no expiry (a stale cyclone notice stays forever), no approval step | `app/actions.ts:169-185`, `lib/data.ts:296-306`, `app/(app)/admin/Admin.tsx:229-263` |
| **Volunteers** | `volunteers` rows created by students (`volunteerAsBuddy`) | self-service; not content. Out of CMS scope (admin console: people/buddy) | `app/actions.ts:106-121` |
| **Static copy**: about / privacy / contact modals | JSX literals inside the client component | code change + deploy. Copy still says "Built for a live demonstration", "This prototype doesn't send messages", "Use fictional details only" | `components/AppShell.tsx:324-396` |
| **Resource links** | hard-coded `<a href>` in 5 places (UTM site, metservice, data-protection office) | code change | `app/(app)/Overview.tsx:224`, `app/(app)/housing/Housing.tsx:278`, `app/(app)/updates/Updates.tsx:81`, `components/UpdateFeed.tsx:110-113`, `components/AppShell.tsx:341,388` |
| **Demo disclaimers** shown on every update/listing ("Illustrative 2026 notice...", "Illustrative listing only") | hard-coded | code change. Will be wrong the moment real content is published | `components/UpdateFeed.tsx:122-124`, `app/(app)/housing/Housing.tsx:270-275` |
| **Media** | Neon Object Storage bucket `uploads` (private). Only housing-report photos, key `housing-reports/<listingId>/<uuid>.<ext>`, read via 600 s presigned URL, admins only. Type from client-supplied `File.type` (not sniffed) | n/a | `neon.ts:6-9`, `lib/storage.ts`, `app/actions.ts:48-67`, `lib/data.ts:285` |
| Admin UI | `app/(app)/admin/page.tsx` + `Admin.tsx`: 3 tabs (Housing reports queue, Buddy matching, Publish club update). Gate: `viewer.role !== "isc_admin"` -> `notFound()`. No editing UI for any content | `app/(app)/admin/page.tsx:7-9` |
| Caching | `cacheComponents: true`, but no `'use cache'` anywhere; every getter calls `getViewer()` (session cookie) so all content reads are request-time DB reads. Edits therefore show immediately; `revalidatePath` is only needed for the client router cache | `next.config.ts:4`, `lib/data.ts:257-306` |
| PWA | `public/sw.js` caches student HTML network-first with offline fallback; `/admin`, `/welfare*` are `NEVER_CACHE` | `public/sw.js:15,80-98` |

**Missing (confirmed):** edit, unpublish/archive, delete (even soft), schedule, drafts, revisions/history, media library, approval step, per-field validation of URLs (url columns are free text rendered into `<a href>`; safe today only because only the seed writes them), any non-developer path for static copy.

**Risky today:**
1. Real students will see "Illustrative / demo" disclaimers next to real content, and the privacy modal tells them to "use fictional details only".
2. Any future "edit" feature on `url` columns would render unvalidated `href` (XSS via `javascript:`) unless validated: fixed by section 5.
3. Hard-deleting an `arrival_tasks` row silently deletes all students' progress (cascade).
4. Stale weather/event notices never expire.
5. Photo MIME is trusted from the client; a renamed file passes.
6. Continuity gap vs. spec slide 7: next year's committee needs a developer for any content change.

---

## 2. Recommendation: build in-app on Neon (no external headless CMS)

| Option | Fit | Why not / why |
|---|---|---|
| **In-app tables + `/admin/content` (recommended)** | Content already lives in Postgres with FKs (`arrival_progress`, `rsvps`, `housing_reports`); one auth/role system (Neon Auth + `profiles.role`); one deploy; one club-owned account set (spec: continuity) | Cost: ~8 screens to build; we own validation/XSS. Mitigated by tiny scope (5 content types) |
| Payload (self-hosted, Next-embedded) | Good admin UI, versions/drafts built in | Brings its own auth + its own tables/migrations next to Drizzle; its roles do not map to Neon Auth `profiles.role`; admin UI is not phone-first; large dependency to hand over to a student committee |
| Sanity (hosted) | Great editor, real-time | Content leaves Postgres: `rsvps.update_id` / `housing_reports.listing_id` FKs and the "needs attention" queries break; second SaaS account (must be created with the project email per AGENTS.md); free-tier limits; API-token handover problem each year |
| Keystatic (git-backed) | No DB | Editors need GitHub accounts, every edit = commit + Vercel rebuild (edits not immediate); does not fit relational listings/reports |
| Directus/Strapi | Full CMS | Another server to host/patch; same auth mismatch |

Decision: **in-app**. Lazy rules: reuse `getViewer()` roles, `ActionResult`, `Badge/Action/PageHeading/Modal`, existing 4 MB image rule, no new runtime dependency (safe text renderer is ~40 lines, section 5).

---

## 3. Content types (small on purpose)

All edited by **`isc_admin` only** (any committee member; no per-type sub-roles). Students and `welfare_staff`: 404 on routes, `FORBIDDEN` from actions.

| Type | Table | Fields (limit) | Publish flow | Cut / not included |
|---|---|---|---|---|
| **Arrival task** | `arrival_tasks` (+cols) | stage (select of 4 existing stages, `section`), title (150), detail (2000, RichText), documents "What to bring" (300), link label (80), URL (https only, optional), position (drag-free: up/down buttons) | draft / published / archived | Stages stay in code (`arrivalSections`): renaming a stage is a rare developer change. Revisit if committee asks |
| **Housing listing** | `listings` (+cols) | title (100), area (60, suggestions), type (select: Private Room / Shared Apartment / Studio), price Rs/month (1 to 500000), walk (80), includes (120), contact (120, optional, signed-in students only), last checked (date, not future), photos (0 to 3, `content_media`), status | draft / published / archived; **Verify** button = checked date today + resolves open reports (existing `verifyListing`) | Per-listing description (YAGNI), map, landlord accounts |
| **Club update** | `club_updates` (+cols) | category (existing 4), title (150), body (2000, RichText), pinned, event date+time + venue (120) (Events only, required for Events), link label + URL (optional, replaces hard-coded "Check the official source"), publish at (schedule), hide on (expiry), status | draft -> published; **Official Announcements**: draft -> pending approval -> published (section 4.3) | Cover images (defer), push notifications |
| **Quick link** | `resource_links` (new) | label (60), URL (https), position, status | draft / published / archived | Grouping; the 4 other hard-coded links stay in code |
| **Site page** | `site_pages` (new, keys `about`, `privacy`, `contact`) | modal title (80), heading (100), body (6000, RichText), link label (80), link URL (https, optional) | draft / published; **row absent or draft = code default shown** | Install modal and weather tip card stay in code |

**FAQs: cut.** Not in the spec; the arrival tasks + buddy + welfare cover the need. **Volunteers: not CMS.** **Stages/filter lists: code.**

Housing filter areas: derive the "Area" options from distinct published listing areas in `Housing.tsx` instead of `housingAreas`, so a new area needs no code change.

---

## 4. Workflow and safety

### 4.1 Status model
`content_status` enum: `draft`, `pending_approval`, `published`, `archived` (archived = hidden but kept; "unpublish" sets `archived`... or back to `draft` via explicit action). Plus `deleted_at` (soft delete, hidden everywhere, restorable from the "Deleted" filter chip). **No hard deletes from the UI.**
Scheduling needs no cron: reads use `status='published' AND (publish_at IS NULL OR publish_at <= now())` and `(expires_at IS NULL OR expires_at > now())`. UI computes badges: Draft, Scheduled (published + future publish_at), Live, Expired, Pending approval, Archived, Deleted.

### 4.2 Revisions
One table `content_revisions` for all types: full JSON snapshot of the row after each change, `changed_fields[]`, action (`create|update|publish|unpublish|verify|archive|delete|restore|approve|submit`), who (id + name snapshot), when. **Restore** = load snapshot, apply as a *new* version with action `restore` (history is never rewritten). History screen shows per revision: when, who, action, changed field names; tapping a revision shows old vs new values for changed fields only (computed from consecutive snapshots).

### 4.3 Approval (Official Announcements)
Spec: "obtain UTM approval before publishing official information". UTM sign-off happens outside the app (email/Student Affairs). In-app model, no new role:
1. Author saves **Official Announcements** as draft, taps **Submit for UTM approval** -> `pending_approval`.
2. A *different* `isc_admin` (four-eyes) opens it and taps **Record UTM approval**, which requires `approval_ref` (who at UTM approved / date / reference; 5 to 200 chars). Sets `approved_by`, `approved_at`, `approval_ref`, status `published`.
3. Edits to a published Official Announcement reset it to `pending_approval` only if title/body/link changed (typo-free: user sees a warning before saving and can choose "Save as new draft version"). Lazy shortcut: any content-field edit of a published Official Announcement = back to pending, hidden until re-approved. Say so in the UI.
4. Author cannot approve own item, except when the committee has exactly one `isc_admin` (count query) -> allowed with a visible warning. Other categories publish directly.
5. Student feed shows an "UTM approved" badge for Official Announcements (`approved_at` not null). Approval fields are never shown to students beyond the badge.
Why not a UTM role: adds enum value + sign-in for UTM staff (account creation out of scope); the attestation text is auditable in revisions.

### 4.4 Preview as student
`/admin/content/<type>/<id>/preview` renders the draft with student CSS inside a 390px-wide frame (desktop) or full width (phone), with a sticky "Preview. Students cannot see this" banner and links Back to edit / Publish. Admin-only. Uses the same `RichText` and existing card classes; accepted drift: it does not import the student card components (they are private to `Housing.tsx` etc.). Published items also get "Open live page".

### 4.5 Concurrency
`version int` on every content row. Edit forms carry the version they loaded. Update = `UPDATE ... SET version = version + 1 ... WHERE id = $1 AND version = $2 RETURNING *`; zero rows -> `fail("Someone else changed this while you were editing. Reload to see their version.")` and the editor offers **Reload** (keeps your text in a collapsed box "Your unsaved text" so nothing is lost). Same check for publish/unpublish/delete/restore.

### 4.6 Validation and XSS (server is the authority; forms mirror limits with `maxLength`)
- Plain text fields: trimmed, length bounds, control characters stripped (`[\u0000-\u0008\u000B\u000C\u000E-\u001F]`), no HTML interpretation anywhere (React escapes).
- **RichText** (title is plain; bodies/detail are RichText): stored as a restricted text format, rendered by `components/RichText.tsx` (new, no dependency, no `dangerouslySetInnerHTML`): blank-line paragraphs, lines starting `- ` become bullets, `**bold**`, `[label](https://...|mailto:|tel:)`. Raw `<script>`/HTML appears as literal text. Rejected: `react-markdown` + plugins (a dependency that must be configured to skip raw HTML; committee will not write Markdown anyway).
- URLs (`url`, `link_url`, links inside RichText): `new URL()` parse, protocol must be `https:` (RichText additionally allows `mailto:` and `tel:`), no username/password, hostname contains a dot, <= 500 chars. Rendered with `target="_blank" rel="noopener noreferrer"` and the hostname shown next to the label so students can see where it goes. Domains are not allow-listed (committee needs freedom); `javascript:`/`data:` are impossible by construction.
- Numbers: integer, bounds; dates: `YYYY-MM-DD` real date; `checked_at` not in the future; event time parsed as Mauritius local time (`Indian/Mauritius`, UTC+4, no DST) and stored `timestamptz`.
- Enums validated against the code constants (`UPDATE_CATEGORIES`, room types, stages).
- Images: JPG/PNG/WebP only, <= 4 MB (same rule as `reportListing`), **magic-byte sniff** (FF D8 FF / 89 50 4E 47 / RIFF....WEBP) instead of trusting `File.type`, extension derived from sniffed type, never the client filename. The client downsizes phone photos (canvas, max 1600 px, JPEG q 0.82) before upload so camera shots (often 5 to 12 MB) pass the 4 MB limit; server still enforces it.
- Server action body limit stays 5 MB (`next.config.ts:7`); one image per action call.

### 4.7 Media
- Bucket: add **`content-public: { access: "public_read" }`** to `neon.ts` (human step: `NEON_PROFILE=utm`, `neon me` must show anesu.mupesa@umail.utm.ac.mu, then `neon deploy`; check Vercel already has `NEON_STORAGE_*`; confirm the existing credentials can write to the new bucket). Keys: `content/listing/<uuid>.<ext>` (unguessable, immutable: a replaced photo gets a new key, so upload with `Cache-Control: public, max-age=31536000, immutable`). Public URL = `${endpoint}/content-public/<key>` built in `lib/cms/media.ts` (`NEON_STORAGE_ENDPOINT ?? AWS_ENDPOINT_URL_S3`). Verify in step 2 whether `files.url()` already returns the permanent URL for a public bucket; otherwise use the builder.
- Why public: listing photos are not sensitive, are shown on every housing view, and presigned URLs change every call (no browser/CDN caching, 10 min expiry). Editor helper text: "no faces, ID documents or number plates".
- **Fallback if the bucket cannot be provisioned:** store under `uploads` at `content/listing/...` and serve through `app/media/[id]/route.ts` (signed-in only, 302 to a 1 h presigned URL, `Cache-Control: private, max-age=300`). Same `content_media` table; only `mediaUrl()` changes.
- `content_media` rows: created on upload with `entity_id = null`; attached when the listing is saved (`entity_type='listing'`, `entity_id`, `position`). Removing a photo sets `detached_at`.
- **Orphan cleanup:** `sweepMedia()` (button "Clean up unused images" on `/admin/content`, no cron) deletes S3 objects + rows for media that is unattached >24 h or detached >7 days (7 days so revision restore still finds its images). Restoring a revision whose image was swept drops that image and tells the editor.
- `alt` text field per image (<= 120), required to publish (accessibility; also plain-language ethos).

### 4.8 Offline / phone behaviours
- `/admin/*` is `NEVER_CACHE` in `public/sw.js:15`, so editor pages are never served offline. Submit buttons disabled with "You're offline" when `navigator.onLine` is false (reuse the online subscription pattern in `AppShell.tsx:50-60`); text drafts are kept in `localStorage` per item key (convenience only, wrapped in try/catch) and offered back on return.
- Student side: SW serves cached HTML only when the network fails, so online students always get fresh content. **Unpublish is not a recall of offline copies**; an offline student may still see the page last visited until they reconnect. Note in editor help; urgent corrections: publish a Weather & Holidays/Official update.

---

## 5. Data model (ADDITIVE migration `0002`)

Decision: **additive columns on the 3 existing tables** (so FKs, RSVPs, progress, reports keep pointing at the same ids and the student read path stays one query) + **4 new tables** (`site_pages`, `resource_links`, `content_revisions`, `content_media`). All new columns are nullable or have defaults; `status` defaults to `'published'` so legacy inserts (`publishUpdate`, seed, existing tests) keep working unchanged. Nothing dropped or renamed.

New file `lib/db/cms-schema.ts` (new tables + enum + shared column helper); `lib/db/schema.ts` gets one `export * from "./cms-schema"` and the extra columns. Both are Drizzle `pg-core`, same style as the existing file.

```ts
// lib/db/cms-schema.ts
import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contentStatus = pgEnum("content_status", ["draft", "pending_approval", "published", "archived"]);

/** Spread into arrival_tasks, listings, club_updates. */
export const publishing = () => ({
  status: contentStatus("status").notNull().default("published"), // legacy rows/inserts stay visible
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"), // Neon Auth user id
});

export const sitePages = pgTable("site_pages", {
  key: text("key").primaryKey(),            // 'about' | 'privacy' | 'contact' (validated in code)
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
  entityType: text("entity_type").notNull(),  // 'arrival_task'|'listing'|'update'|'link'|'page'
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
  key: text("key").notNull().unique(),         // content/listing/<uuid>.<ext>
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  alt: text("alt").notNull().default(""),
  entityType: text("entity_type"),             // null until attached
  entityId: text("entity_id"),
  position: integer("position").notNull().default(0),
  uploadedBy: text("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  detachedAt: timestamp("detached_at", { withTimezone: true }),
}, (t) => [index("content_media_entity_idx").on(t.entityType, t.entityId)]);
```

Added to existing tables in `lib/db/schema.ts` (import `publishing`, `contentStatus` from `./cms-schema`; spread `...publishing()` and add):

| Table | New columns |
|---|---|
| `arrival_tasks` | `position integer not null default 0`; `isSample boolean not null default false`; `...publishing()`; `id` gets `.default(sql\`nextval('arrival_task_seq')\`)` with `export const arrivalTaskSeq = pgSequence("arrival_task_seq", { startWith: 1000 })` (same pattern as `welfareEnquirySeq`; seeded ids 1 to 8 untouched) |
| `listings` | `contact text` (nullable), `isSample boolean not null default false`, `...publishing()` |
| `club_updates` | `eventAt timestamptz`, `venue text`, `linkLabel text`, `linkUrl text`, `publishAt timestamptz`, `expiresAt timestamptz`, `approvedBy text`, `approvedAt timestamptz`, `approvalRef text`, `isSample boolean not null default false`, `...publishing()` (existing `meta` stays NOT NULL; CMS writes a composed value: events "venue · time", others "ISC Committee"; `published_by` kept = publisher id) |

**Backfill appended by hand to the generated `0002_*.sql`** (all idempotent-safe because migrations run once):
```sql
UPDATE "arrival_tasks" SET "position" = "id" * 10;
UPDATE "listings"      SET "is_sample" = true;   -- existing rows are the demo seed
UPDATE "club_updates"  SET "is_sample" = true;
```
`is_sample` powers: (a) the "Illustrative" disclaimers render only for sample rows (student edit), (b) a **Go-live checklist** card on `/admin/content` ("12 sample listings, 3 sample updates still visible: Review / Archive all samples"), (c) editor shows "Sample" badge and a "Mark as real" toggle (saving does not silently clear it).
`scripts/seed.ts` change: seed rows pass `isSample: true`; add default `site_pages` content is NOT seeded (code defaults used, section 6).

Apply: `pnpm db:generate` -> inspect SQL has only `CREATE TYPE/TABLE`, `ALTER TABLE ... ADD COLUMN`, `CREATE SEQUENCE`, `ALTER COLUMN id SET DEFAULT` -> append backfill -> `pnpm db:migrate` against the dev branch first (`NEON_PROFILE=utm`, `neon me`), then production. Migration ordering vs the admin console's `audit_log` migration: see section 12 (never generate concurrently; one linear snapshot chain).

---

## 6. Reading path (student side)

Edits to `lib/data.ts` (shared; integration implementer):

| Getter | Change |
|---|---|
| `getArrivalTasks()` | add `where status='published' and deleted_at is null`, `orderBy(section, position, id)` |
| `getCompletedTaskIds()` | join to published tasks so unpublished/deleted tasks do not inflate "x of y done" (Overview divides by published count) |
| `getListings()` | add same filter; add `contact`, `isSample`, and `photos` (one extra query on `content_media` `entity_type='listing' and entity_id = any(ids) and detached_at is null`, ordered by position, mapped to `{ url, alt }` via `mediaUrl(key)`) |
| `getUpdates()` | filter published + not deleted + `publish_at <= now()` + not expired; ordering `pinned desc, coalesce(publish_at, created_at) desc`; return `eventDate` parts from `event_at` (Events) else from `coalesce(publish_at, created_at)`; add `venue`, `linkUrl`, `linkLabel`, `approved`, `isSample` |
| `toggleRsvp`, `toggleArrivalTask`, `reportListing` (actions.ts) | existence checks also require published and not deleted |
| new `getSitePages()` / `getQuickLinks()` in `lib/cms/read.ts` | DB row if `status='published'` else code default from `lib/cms/defaults.ts` (the current modal copy, minus "prototype/demo" wording, wording to be confirmed with the committee) |

Types (`lib/types.ts`, shared): extend `Listing` (`contact?`, `photos?: {url; alt}[]`, `sample?`), `ClubUpdate` (`eventDate?`, `venue?`, `link?: {label; url}`, `approved?`, `sample?`), add `SitePage`, `QuickLink`. Admin-only types live in new `lib/cms/types.ts`.

**Caching/revalidation (Next 16.4, `cacheComponents: true`):**
- Do **not** introduce `'use cache'` for content in v1. Getters already read the session cookie (request-time), 12 to 50 rows, Neon HTTP is fast; edits are visible on the next request with zero staleness. (`'use cache'` cannot read cookies; wrapping would force a viewer-free inner function plus tags. Optional later optimisation only: inner `'use cache'` + `cacheTag('content:housing')`, mutations call `updateTag('content:housing')` (read-your-own-writes, Server Actions only) per `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md`. If that is ever added, do NOT use bare `revalidateTag(tag)` (deprecated; needs the `profile` arg).)
- Mutations call `revalidatePath` (clears the editor's client router cache and any prerendered shell) via the existing `revalidate(...)` helper pattern:

| Type | Paths |
|---|---|
| arrival task | `/`, `/arrival`, `/admin/content`, `/admin/content/guide` |
| listing | `/`, `/housing`, `/admin`, `/admin/content`, `/admin/content/housing` |
| update | `/`, `/updates`, `/admin/content`, `/admin/content/updates` |
| site page, quick link | `revalidatePath("/", "layout")` (AppShell data comes from `app/(app)/layout.tsx`), plus `/admin/content/pages` or `/links` |
| any edit | its history/preview routes are dynamic; no extra call |

- Scheduled publish/expiry is evaluated in SQL per request, so no revalidate is needed when the time passes.
- Verify manually once: student browser tab open on `/updates`, admin publishes, student navigates (router cache) and sees it. With dynamic pages this relies on Next 16 default dynamic stale time 0; if not, add `revalidatePath` already listed.

Student component edits (shared files; integration implementer): `Arrival.tsx` (hide link row when `url` empty), `Housing.tsx` (photos strip, contact line, disclaimer only if `sample`, area options derived from data), `UpdateFeed.tsx` (event date/venue, per-update link replaces the hard-coded metservice/UTM link, "UTM approved" badge, disclaimer only if `sample`), `Overview.tsx` ("Keep these close" from `getQuickLinks()`, keep "Campus essentials" and "Contact" items), `app/(app)/layout.tsx` (fetch pages + links, pass to `AppShell`), `components/AppShell.tsx` (modals render `RichText` from `pages` prop; keep buddy-email line, welfare link and install modal in code).

---

## 7. Server API

Core logic in `lib/cms/*.ts` (`import "server-only"`); thin `"use server"` wrappers in `app/(app)/admin/content/actions.ts` (new file, so `app/actions.ts` is barely touched). Every action starts with `requireAdmin()`:

```ts
// lib/cms/auth.ts
export async function requireAdmin(): Promise<{ viewer: Viewer } | { error: ActionResult }> {
  const viewer = await getViewer();
  if (!viewer) return { error: SIGNED_OUT };
  if (viewer.role !== "isc_admin") return { error: FORBIDDEN };
  return { viewer };
}
```
(`fail`, `SIGNED_OUT`, `FORBIDDEN`, `text()`, `isId()` are currently private to `app/actions.ts:23-33`; move them to `lib/cms/util.ts` as copies, do not edit actions.ts for this. Dedupe later.)

All return `Promise<ActionResult>` (`lib/types.ts:253`); `id` carries the new row id. "Audit" = `logAudit(...)` from the admin-console helper (section 12); every mutation also calls `recordRevision(...)`.

| Action | Input | Checks | Writes | Revalidate |
|---|---|---|---|---|
| `saveTask(input)` | `{ id?, version?, stage, title, detail, documents, linkLabel, url, status }` | admin; limits; https URL if present; stage 0..3; if `id`, version match | insert/update `arrival_tasks`; position = max+10 on create; revision | arrival paths |
| `moveTask(id, "up"\|"down")` | | admin | swap `position` with neighbour in same stage | arrival paths |
| `saveListing(input)` | `{ id?, version?, title, area, type, price, walk, includes, contact, checkedAt, status, mediaIds[], markReal? }` | admin; limits; type enum; price; checkedAt<=today; mediaIds belong to uploader, max 3, alt present to publish | upsert; attach/detach `content_media`; revision | housing paths |
| `verifyListing(id)` (existing, `app/actions.ts:74`) | | unchanged admin check | add `recordRevision('verify')` + audit; keep behaviour (checked=today, resolve reports) | unchanged |
| `uploadContentImage(formData)` | `file`, `alt` | admin; type sniff; <=4 MB | S3 put to `content-public`, insert `content_media` (unattached); returns `{ ok, id }` (media id) | none |
| `saveUpdate(input)` | `{ id?, version?, category, title, body, pinned, eventAt?, venue?, linkLabel?, linkUrl?, publishAt?, expiresAt?, status }` | admin; Events need eventAt+venue; `expiresAt > publishAt`; Official Announcements cannot be saved as `published` here (must go through approval) | upsert; compose `meta`; set `published_by`; revision | update paths |
| `submitForApproval(id, version)` | | admin; category = Official Announcements; status draft | -> `pending_approval` | update paths |
| `approveUpdate(id, version, approvalRef)` | ref 5..200 | admin; item pending; approver != author unless sole admin | -> `published`, `approved_by/at/ref` | update paths |
| `setStatus(type, id, version, status)` | status in draft/archived/published | admin; type in {task, listing, update, link, page}; Official Announcement cannot jump to published | status + revision (`publish`/`unpublish`/`archive`) | by type |
| `deleteContent(type, id, version)` / `restoreDeleted(type, id)` | | admin | set/clear `deleted_at`; revision | by type |
| `restoreRevision(revisionId)` | | admin; snapshot's entity exists; Official Announcement restores as `pending_approval` if text differs | apply snapshot as new version, action `restore` | by type |
| `saveLink(input)`, `saveSitePage(input)` | as section 3 | admin; keys whitelist (`about|privacy|contact`) | upsert + revision | layout |
| `sweepMedia()` | | admin | delete S3 objects + rows (section 4.7) | none |
| `markSampleReal(type, id, version)` / `archiveAllSamples()` | | admin | `is_sample=false` / status archived on sample rows; revisions | by type |

Reads (`lib/cms/read.ts`, each returns `[]`/`null` for non-admins like `getBuddyRequests`): `getContentCounts()`, `listContent(type, { q, status, page })` (page size 20), `getContentItem(type, id)`, `getRevisions(type, id)`, `getAttention()` (stale listings >30 days, pending approvals, drafts older than 14 days, open housing reports count, sample items still live, scheduled-soon).

Concurrency/transactions shortcut: `lib/db/index.ts` uses `drizzle-orm/neon-http` (no interactive transactions). `saveX` does the version-guarded UPDATE first, then inserts the revision; if the revision insert fails the edit stands and the error is logged (`// shortcut:` comment). Do not switch drivers for this.

---

## 8. UI and information architecture

Routes (all under `app/(app)/admin/content/**`, new `layout.tsx` does `getViewer()` role check -> `notFound()` and renders a sub-nav; Next 16: `params` and `searchParams` are Promises, await them; pages sit under the existing `(app)/layout.tsx` Suspense so dynamic reads are fine):

```
/admin/content                       index (cards, attention, go-live checklist, sweep button)
/admin/content/guide                 arrival tasks list (grouped by stage)
/admin/content/guide/new | [id]      editor
/admin/content/housing               listings list
/admin/content/housing/new | [id]
/admin/content/updates               updates list
/admin/content/updates/new | [id]
/admin/content/links                 quick links list (+ modal editor, 1 to 5 rows)
/admin/content/pages                 3 site pages list
/admin/content/pages/[key]           editor
/admin/content/<type>/[id]/history   revisions + restore
/admin/content/<type>/[id]/preview   preview as student
```
Common to every list: search box, status chips (`All Live Draft Scheduled Pending Archived Deleted`), "+ New" button, rows = card (not table) on phone, table on desktop. Common to every editor: sticky bottom action bar on phone (Save draft | Publish), status badge top, "History" and "Preview" links, optimistic-concurrency banner.

Mobile rules (new CSS, existing `.button` is 11 px text / ~40 px tall, too small): all CMS controls `min-height: 44px`, inputs `font-size: 16px` (stops iOS zoom), labels above fields, one column at <=767px, date/time use native `<input type="date|datetime-local">`, numeric `inputMode="numeric"`, URL `type="url" inputMode="url" autocapitalize="off"`, image field uses `<input type="file" accept="image/jpeg,image/png,image/webp">` WITHOUT `capture` so phones offer camera or gallery, bottom bar `padding-bottom: env(safe-area-inset-bottom)` and not covered by the on-screen keyboard (use `position: sticky; bottom: 0`, not `fixed`).

### 8.1 Index `/admin/content`
360px:
```
[ISC COMMITTEE · CONTENT]
Content
Keep the guide, housing and notices current.
┌ Needs attention (4) ───────────────┐
│ ⚠ 2 housing checks older than 30 d │ >
│ ⏳ 1 announcement awaiting UTM OK  │ >
│ ✎ 3 drafts older than 14 days      │ >
│ ⓘ 12 sample listings still live    │ >
└────────────────────────────────────┘
┌ Arrival guide ─ 8 live · 1 draft ──┐ >
┌ Housing ─────── 12 live · 2 stale ─┐ >
┌ Club updates ── 3 live · 1 pending ┐ >
┌ Quick links ─── 3 live ────────────┐ >
┌ Site pages ──── about · privacy · contact ┐ >
[Clean up unused images]
```
Desktop (>=1024): same cards in a 3-column grid, "Needs attention" as a left column (`content-with-aside`).

### 8.2 List (updates shown; others analogous)
360px:
```
Club updates            [+ New]
[ search title…        ]
(All)(Live)(Draft)(Sched)(Pending)(Archived)(Deleted)   <- horizontal scroll chips
┌─────────────────────────────┐
│ Official · UTM approved     │  Badge
│ Student handbook is here    │
│ Live · edited 2d by Priya   │
│ [Edit] [Unpublish] [⋯]      │  >=44px
└─────────────────────────────┘
```
Desktop: table `Title | Category | Status | Updated | Actions` with the same actions. Housing rows add price, area, "checked 14 Nov" with stale badge, **[Verify]**. Tasks grouped under the 4 stage headings with up/down buttons.

### 8.3 Editor (update)
360px (single column, scroll; bar sticky):
```
← Club updates        Draft badge
Category  [Events            v]
Title     [__________________]  42/150
Details   [multiline 6 rows__]  0/2000   (Write | Preview)  tip: blank line = new paragraph, "- " = bullet
Event     [date][time]   Venue [____]     (Events only)
Link      Label [____]  URL [https://]    (optional)
☐ Pin to the top
Schedule  Publish at [datetime]  Hide on [datetime]   (collapsed "More options")
──────── sticky bar ─────────
[Save draft] [Publish ▸]       (Official: [Submit for UTM approval])
History · Preview as student · Delete
```
Desktop: two columns: form left (max 640px), right aside = live student-style preview card + status/history box. Official Announcement pending state: approver view shows read-only text + "UTM approval reference" field + **Record UTM approval**; author sees "Waiting for another committee member".
Housing editor adds: photo strip (up to 3 thumbnails with alt inputs, "Add photo" button), `Last checked` date with **[Verified today]** shortcut button, "This listing is sample data [Mark as real]". Task editor adds stage select and up/down on the list. Site-page editor shows "Currently showing: your text | the built-in default" and **[Reset to default]** (sets draft).
Delete confirmation uses existing `Modal`: "Delete 'X'? You can restore it from the Deleted filter."

### 8.4 History `/…/[id]/history`
```
History · Weather notice            [Back]
● v5  Today 09:12  Priya  Published        >
● v4  Today 09:10  Priya  Edited: title, body   >   (tap: old → new values)
● v1  12 Nov 15:00  Sameer  Created
                         [Restore this version]  (≥44px, confirm Modal)
```

### 8.5 Media picker
Inside the listing editor only (v1): a `Modal` "Add photo" with two buttons "Take photo" / "Choose from gallery" (both the same file input, label differs), preview, required alt text, resize note, upload progress, error text from `ActionResult`. No standalone media library page; reuse across listings is out of scope (re-upload instead).

### 8.6 Components and CSS
Reuse: `Badge` (tones positive/warning/stale/neutral map to Live/Pending|Scheduled/Stale|Deleted/Draft|Archived), `Action`, `PageHeading`, `Modal`, `TextLink`, classes `.surface`, `.form-card`, `.tabs`/`.tabs.compact`, `.filter-chips`, `.queue-card`, `.spread-actions`, `.section-heading`, `.info-banner`, `.empty-state`, `.form-footnote`.
New components (all new files): `components/RichText.tsx` (student-safe renderer, used by student pages too), `app/(app)/admin/content/` `StatusChips.tsx`, `ContentList.tsx`, `EditorBar.tsx`, `ImageField.tsx`, `FieldCounter.tsx`, `RevisionList.tsx`, `ConflictBanner.tsx`.
New CSS: append one block to `app/globals.css` under a clear comment, all classes prefixed `cms-` so the admin-console planner cannot collide: `.cms-grid`, `.cms-card`, `.cms-list`, `.cms-row`, `.cms-row-actions`, `.cms-field`, `.cms-input` (min-height 44px, 16px font), `.cms-counter`, `.cms-bar` (sticky bottom action bar + safe-area), `.cms-photos`, `.cms-thumb`, `.cms-diff`, `.cms-banner`, `.cms-preview-frame` (390px wrapper), `.rich` (RichText typography, also used on student side). Tell the admin-console planner to put their classes under `.adm-*`.

---

## 9. Seed and defaults

- `scripts/seed.ts`: add `isSample: true`, `position: id*10`; rows stay idempotent. No change in IDs. After seeding, run existing `setval` loop (`arrival_tasks` uses the new sequence, so no setval there).
- `lib/cms/defaults.ts`: `defaultPages` = today's about/privacy/contact copy converted to RichText (with "demonstration" wording flagged `TODO(committee): replace before launch`), `defaultLinks` = UTM website. Reader falls back to defaults when no published row, so a fresh database or a deleted row can never blank a modal.

---

## 10. Test plan (Playwright, `tests/cms.spec.ts` + `tests/cms-helpers.ts`)

Three role accounts are in `.env.local` (`E2E_STUDENT/ADMIN/WELFARE_*`); use `pageAs(browser, 'isc_admin')` from `tests/roles.ts`. Tests share the live DB and run one worker: every created row uses title prefix `E2E-CMS <Date.now()>`.

| # | Flow | Assert |
|---|---|---|
| C1 | admin creates update (Events) -> save draft | student `/updates` does NOT show it |
| C2 | admin publishes | student `/updates` shows title, event date tile, venue; Overview shows it in latest |
| C3 | admin unpublishes (archive) | student no longer sees it; admin list shows Archived chip |
| C4 | admin edits title | history shows 2+ revisions with "title"; restore old version -> text back |
| C5 | Official Announcement: author submits -> status Pending, hidden; (same admin, only one admin in the test DB) approval allowed with warning needs `approval_ref`; empty ref rejected; after approval student sees "UTM approved" badge |
| C6 | schedule: publish_at in the future -> hidden; (set past via a second edit) -> visible; expires_at in the past -> hidden |
| C7 | housing: create draft listing with photo (small PNG fixture) -> not visible to student; publish -> visible with photo (`img` natural width > 0); Verify sets today's date; stale badge absent |
| C8 | arrival: add task in stage 2 -> student sees it in that stage, ordering by position (move up); archive -> progress counter unchanged / no >100% |
| C9 | static page: edit "contact" -> student opens contact modal and sees new text; "Reset to default" restores built-in copy |
| C10 | quick link: add https link -> shows on Overview; `javascript:alert(1)` and `http://x.com` rejected with message |
| C11 | access: student and welfare_staff `goto('/admin/content')`, `/admin/content/updates/new` -> 404; direct call of every action via `page.evaluate` is not possible, so add a **unit-level** guard test (`tests/cms-actions.spec.ts` using `request`/server action POST is brittle): instead assert each action's first line is `requireAdmin()` with a grep test in CI (`rg -c requireAdmin app/(app)/admin/content/actions.ts` equals export count) |
| C12 | XSS: title `"><img src=x onerror=window.__x=1>` and body `<script>window.__x=1</script> [x](javascript:alert(1)) **b**` -> student pages render literal text, `window.__x` undefined, bold rendered, bad link rejected on save |
| C13 | uploads: 5 MB file -> error "under 4 MB"; `.txt` renamed `.png` -> rejected (magic bytes); webp OK; 4th photo rejected; client resize path produces <4 MB from a 6 MB JPEG |
| C14 | concurrency: two admin pages open item, A saves, B saves -> B sees conflict banner, no overwrite |
| C15 | phone (360x740 via `page.setViewportSize`): editor has no horizontal scroll (`scrollWidth <= clientWidth`), every `.cms-*` button/input height >= 44, sticky bar visible with keyboard-sized viewport (set viewport height 400), `font-size` of inputs >= 16px |
| C16 | soft delete: delete -> gone for students, present under Deleted chip; restore -> back as draft |

Regression: existing flows 1 to 6 and `all screens fit viewport` must still pass (listing 3 report/verify, update publish test 5b via legacy `publishUpdate`; see section 11 step 7).
Cleanup: extend `scripts/reset-e2e.ts` (shared, one line loop) to delete content rows whose title starts `E2E-CMS ` (tables `club_updates`, `listings`, `arrival_tasks`, `resource_links`), plus their `content_revisions`/`content_media` rows and S3 objects (`sweepMedia` logic callable from script), and reset `site_pages` rows created by tests (`delete from site_pages where updated_by = any(ids)`). Tests also delete their own rows in `afterAll` via direct SQL (`@neondatabase/serverless`) so reruns stay green; `pnpm db:reset-e2e` remains the safety net before runs. Seed rows are never edited by tests (no cross-test state).

---

## 11. Implementation order (checklist for the implementer)

Prerequisite for the whole plan: run Neon commands with `NEON_PROFILE=utm` and `neon me` = anesu.mupesa@umail.utm.ac.mu; work on a Neon dev branch for migration rehearsal; production DB is live and shared with tests, so additive only.

1. **Schema + migration** (CMS implementer): create `lib/db/cms-schema.ts`; edit `lib/db/schema.ts` (re-export + columns + sequence); `pnpm db:generate`; open `drizzle/0002_*.sql`, confirm additive only, append the 3 backfill UPDATEs; `pnpm db:migrate` on dev branch; run existing e2e (must be green); then production. Coordinate ordering with admin-console (section 12).
2. **Storage**: add `content-public` bucket to `neon.ts`; `neon deploy` (human-confirmed; NEON_PROFILE=utm); new `lib/cms/media.ts` (`contentFiles` instance, `sniffImage`, `putImage`, `mediaUrl`, `sweepMedia`); smoke-test upload + anonymous GET + `Cache-Control`. If bucket provisioning blocked, switch to the proxy fallback (4.7).
3. **Core libs** (new files): `lib/cms/util.ts` (fail/FORBIDDEN/text/isId copies, `validateUrl`, `cleanText`), `lib/cms/auth.ts`, `lib/cms/revisions.ts` (`recordRevision`, `diffFields`), `lib/cms/{tasks,listings,updates,links,pages}.ts` (save/status/delete/restore with version guard), `lib/cms/read.ts`, `lib/cms/defaults.ts`, `lib/cms/audit.ts` (adapter to admin-console helper). Unit-test `validateUrl`, `sniffImage`, `RichText` with plain `node --test`/tsx if desired.
4. **Safe renderer**: `components/RichText.tsx` + XSS fixtures.
5. **Actions + admin UI** (owned folder): `app/(app)/admin/content/{layout,page,actions}.ts(x)`, `guide|housing|updates|links|pages` routes, `history`, `preview`, shared small components, `cms-*` CSS block appended to `app/globals.css`. Build in this order: updates (replaces the "Publish" tab) -> housing (+ images) -> arrival -> pages -> links -> index/attention -> history/restore -> approval flow.
6. **Student read path (integration pass; one implementer, after admin-console edits to the same files have landed)**: `lib/data.ts` getters, `lib/types.ts`, `app/actions.ts` guards (`toggleRsvp`, `toggleArrivalTask`, `reportListing` published-only, `verifyListing` + `recordRevision`), `app/(app)/layout.tsx`, `components/AppShell.tsx`, `Arrival.tsx`, `Housing.tsx`, `UpdateFeed.tsx`, `Overview.tsx`, `scripts/seed.ts`, `scripts/reset-e2e.ts`.
7. **Retire the old publish form**: make `publishUpdate` (`app/actions.ts:169`) a thin wrapper over `saveUpdate(status published)` (keeps flow 5b green), then (admin-console owns `Admin.tsx`) replace the "Publish club update" tab with a link to `/admin/content/updates/new` and update test 5b to use the CMS editor.
8. **Nav**: add the "Content" entry in the admin nav (admin-console owns the nav; supply `{ page: "Content", href: "/admin/content", icon: "book" }`; `book` exists in `components/icons.tsx`).
9. **Tests**: write section 10 specs; run `pnpm db:reset-e2e && pnpm test:e2e` (desktop + mobile projects).
10. **Docs for continuity**: short `docs/content-guide.md` (how a new committee edits content, approval rule, go-live checklist). This is the "documentation" the spec lists under operational controls.

**Verification before calling it done:** `pnpm lint`; `pnpm build` (Next 16 + cacheComponents compile, no "uncached data outside Suspense" errors on new admin pages); migration diff shows no DROP/RENAME; `pnpm test:e2e` all green twice in a row; manual phone check at 360px in Chrome device mode (no horizontal scroll, keyboard does not hide the save bar, camera/gallery chooser works on a real phone); incognito student check that a draft/archived/deleted item is absent; offline check (airplane mode) that student pages still load and `/admin/content` shows the offline page.

---

## 12. File ownership and conflict map

Legend: **CMS** = this plan's implementer; **ADM** = admin-console implementer; **INT** = the single integration implementer who does step 6 sequentially after both plans' feature code is merged (so shared files never get concurrent edits).

**CMS owns (new files / folders, no conflict):**
`app/(app)/admin/content/**` (incl. `actions.ts`), `lib/cms/*.ts`, `lib/db/cms-schema.ts`, `components/RichText.tsx`, `lib/cms/types.ts`, `tests/cms*.ts`, `docs/content-guide.md`, `drizzle/0002_*` (migration for CMS), student-side read-path changes.

**Shared files and who edits them:**

| File | Edit | Who |
|---|---|---|
| `lib/db/schema.ts` | one `export * from "./cms-schema"`, `import { publishing, contentStatus }`, new columns on 3 tables, `arrivalTaskSeq` | CMS (step 1). ADM appends `auditLog` table in the same file: both edits are additive and in different regions; **never run `db:generate` concurrently** |
| `drizzle/**`, `drizzle/meta/*` | migration 0002 / 0003 | Linear chain: whoever lands first is 0002, the other rebases, regenerates and gets 0003. CMS migration must not include `audit_log` and vice versa |
| `lib/db/index.ts` | none needed (re-export via schema.ts) | n/a |
| `drizzle.config.ts` | none (drizzle-kit follows the `export *` import; verify generate output) | n/a |
| `neon.ts` | add `content-public` bucket | CMS |
| `package.json` | none planned (no new dependency) | n/a |
| `app/actions.ts` | published-only guards in 3 actions, `recordRevision` in `verifyListing`, `publishUpdate` wrapper | INT (ADM also touches housing-report/buddy actions in this file: INT merges) |
| `lib/data.ts` | getters per section 6 | INT |
| `lib/types.ts` | extend `Listing`, `ClubUpdate`, add `SitePage`, `QuickLink` | INT |
| `lib/ui.ts` | none (`housingAreas` becomes unused for filters; leave) | n/a |
| `components/AppShell.tsx` | `pages` prop + RichText modals; admin nav entry belongs to ADM's nav rework | INT (modals) / ADM (nav) |
| `app/(app)/layout.tsx` | fetch pages + links | INT |
| `app/globals.css` | append `cms-*` and `.rich` block at end of file; ADM appends `adm-*` block | each appends in its own marked section; merge conflicts at EOF are trivially resolved |
| student pages `Arrival.tsx`, `Housing.tsx`, `UpdateFeed.tsx`, `Overview.tsx` | per section 6 | INT |
| `app/(app)/admin/Admin.tsx`, `page.tsx` | retire "Publish club update" tab | ADM (after step 7 wrapper exists) |
| `scripts/seed.ts`, `scripts/reset-e2e.ts` | `isSample`, cleanup loop | INT |
| `public/sw.js` | none (admin already `NEVER_CACHE`) | n/a |

**Boundary rules to reconcile with the admin console** (`docs/plans/admin-console.md`; if it does not exist yet when you start, assume these and adjust):
1. ADM owns `/admin` shell/layout/nav, dashboard, people/roles, audit log page, housing-report + buddy moderation, CSV exports, `audit_log` table, shared audit helper. CMS owns everything under `/admin/content/**`.
2. CMS calls the shared helper from every mutation through the one adapter `lib/cms/audit.ts`: `logAudit({ actorId, actorName, action, entityType, entityId, summary })`. Until ADM's helper lands the adapter is a no-op; revisions already give CMS its own change history.
3. The ADM housing-report queue reads listings via `getListings()`, which will now return only published rows: a report on an unpublished listing would vanish from the queue. ADM should query listings by id regardless of status (or call `lib/cms/read.ts` `getListingBasics(ids)`).
4. ADM nav: one "Content" item to `/admin/content`; sub-nav lives inside CMS layout, so ADM needs no knowledge of CMS routes.
5. Shared CSS prefixes: CMS `cms-*`, ADM `adm-*`; both reuse the existing component classes without redefining them.
6. Both plans use `isc_admin` as the only editor role; welfare staff and students never get CMS or audit access.

---

## 13. Out of scope

Rich-text/WYSIWYG editor; image editing beyond client resize; standalone media library; club-update cover images; multi-language content; FAQs; editable arrival stage names and housing type list; per-type editor roles or a UTM staff login; email/push notification on publish; scheduled jobs/cron (reads are time-aware instead); hard delete from UI; content import/export (CSV belongs to ADM); real-time collaboration (optimistic locking only); analytics on content views; replacing the hard-coded weather tip card, install modal, welfare screens; any change to welfare data handling.

## 14. Open decisions for the committee/lecturer (defaults chosen above)

1. Housing `contact` field: include (default) or drop for landlord privacy.
2. Edits to a published Official Announcement force re-approval (default) vs only on text changes.
3. Wording of the default about/privacy/contact copy once "demo" language is removed (needs committee/UTM review before launch; slide 7 approval rule applies to it too).
4. Public `content-public` bucket (default) vs signed-in proxy route for listing photos.
