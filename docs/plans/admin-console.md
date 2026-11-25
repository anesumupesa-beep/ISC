# ISC Connect: Admin console plan

Scope: the ISC committee ("ISC Admin") side, plus the boundary with Welfare Staff and with the CMS plan.
Status: plan only. Nothing here is implemented. Written against the code as of 2026-11-26.

Product source: `ISC_Connect_Refined.pptx` (slides 4, 6, 7, 8, 9). Requirements that drive this plan:
- Roles: students, buddy volunteers, ISC committee (admins), authorised welfare staff. Welfare records restricted to authorised staff (slide 7, 6).
- Mauritius Data Protection Act 2017: collect only what is necessary (slide 7).
- UTM approval before publishing official information; last-checked dates on housing (slide 7).
- Continuity when the committee changes each year; club-owned accounts, backups, documentation (slides 6, 7, 9).
- Pilot KPIs: new arrivals using the Arrival guide (SDG 4), buddy requests matched (SDG 10), housing reports resolved (SDG 16), student uptake, response acknowledgement, buddy participation, Housing Hub feedback, task completion (slides 8, 9).

---

## 1. Audit: what an ISC Admin and Welfare Staff can do today

### 1.1 ISC Admin: what exists

| Capability | Evidence |
|---|---|
| Workspace at `/admin`, `notFound()` for anyone not `isc_admin` | `app/(app)/admin/page.tsx:9` |
| 3 tabs in one client component: housing reports, buddy matching, publish update | `Admin.tsx:11`, `:88-141`, `:142-206`, `:207-241` |
| Verify listing: sets `checked_at` to today (Mauritius) and marks ALL open reports for it resolved | `actions.ts:74-87` |
| See reported listings, reason, note, photo link (presigned 10 min) | `data.ts:55-77`, `page.tsx:17` |
| Assign a volunteer to a buddy request | `actions.ts:124-136` |
| Publish a club update (category, title, body) | `actions.ts:170-185` |
| Role guard on every admin action | `actions.ts:77, 127, 173` |
| Roles live in `profiles.role`; read fresh each request, so a change is immediate | `data.ts:28-39` |
| Only way to change a role: CLI `pnpm db:set-role <email> <role>` | `scripts/set-role.ts:19-20` |

### 1.2 ISC Admin: what is missing

| Gap | Why it matters (deck reference) |
|---|---|
| No dashboard or KPIs | Pilot must "prove value" with 8 measures (slides 8, 9); nothing computes any of them |
| No user list, no role UI, no search | Committee handover (slide 7) needs a UI, not a developer with a terminal |
| No membership list or export | `memberships` (name, email, programme) is write-only (`schema.ts:77-83`); membership is objective 4 |
| No volunteer approval | Any student can become a "volunteer" (`actions.ts:106-121`) and is instantly assignable (`data.ts:158-164`); their email is then shown to the matched student (`data.ts:126-137`) |
| Housing: no dismiss/reject, no resolution note, no who/when | Only path to resolve a report is "verify", which also refreshes the date; a false report forces a date refresh. `resolved` is a bare boolean (`schema.ts:57`) |
| Housing: stale listings unreachable | Admin page only lists listings with an open report (`page.tsx:17`). The 30-day stale flag exists (`data.ts:63`) but admins cannot act on a stale, unreported listing |
| Housing: multiple reports hidden | `reports.find(...)` returns only the newest open report per listing, and only that one's photo (`data.ts:68-69`) |
| Buddy: no capacity check, no reassign guard, no unassign, no close | `assignBuddy` blindly sets `volunteer_id` (`actions.ts:131`); `volunteers.capacity` is never enforced |
| No audit log | No record of who verified, assigned, published or changed a role |
| No CSV export | Needed for UTM reporting, committee handover, attendance lists |
| Publishing has no UTM-approval record, no edit, no unpublish | The accuracy checkbox is client-only and never stored (`Admin.tsx:233-236`); `meta` is hardcoded (`actions.ts:180`). Owned by the CMS plan, not this one |
| Nav: admin sees ONE nav item; page title only matches exact `/admin` | `AppShell.tsx:95-107` (`navItems = [workspace]`), bottom nav slices 5 (`~:298`) |
| Copy still says "DEMO WORKSPACE" | `Admin.tsx:64` |

### 1.3 Welfare Staff: what exists and what is missing

Exists: `/welfare-staff` page guarded by role (`welfare-staff/page.tsx:9`), list of all enquiries, expand to read, set status Submitted / Acknowledged / Referred to Counsellor (`actions.ts:205-216`, `WelfareQueue.tsx`).

Missing (welfare-side, NOT part of this plan; flag to the team):
- Staff cannot see WHO submitted (`toEnquiry` omits `userId`, `data.ts:166-169`); they have a contact method but no name or email, so they cannot actually follow up. This is a product and privacy design question to settle with UTM welfare before the pilot.
- No `acknowledged_at` timestamp, so "response acknowledgement" cannot be measured as a time (only as a status share).
- No filter or sort by urgency, no staff note, no record of which staff member changed a status.
- `getAllEnquiries` throws for other roles (`data.ts:185`); the page guards first, so it is safe, just inconsistent with the `[]` pattern.

### 1.4 Separation of ISC Admin and Welfare Staff today: holds

| Control | Evidence |
|---|---|
| Admin gets no welfare rows, not even their own | `data.ts:174-175` |
| `getAllEnquiries` throws unless `welfare_staff` | `data.ts:185` |
| Admin cannot submit an enquiry | `actions.ts:191` |
| Only `welfare_staff` can update a status; admin gets FORBIDDEN | `actions.ts:208` |
| Staff page `notFound()` for admin | `welfare-staff/page.tsx:9` |
| Admin UI banner states the rule | `Admin.tsx:68-74` |

Weak point: separation is by convention, one `if` per function. The admin console adds many new queries, so section 3.2 adds a single guard helper and a grep-based check so no new admin code can read `welfare_enquiries` beyond one aggregate count.

### 1.5 Risks (ranked)

1. Volunteer self-approval plus email disclosure: any student can register as a volunteer, be assigned, and have their email shown to a new arrival. No vetting. (High; safeguarding.)
2. No audit trail on role changes, publishing, verification (accountability, Act 2017, committee turnover).
3. Role change needs DB access via CLI, runs against whichever `DATABASE_URL` is in env, upserts a profile for any email, and logs nothing (`set-role.ts:14-20`).
4. Capacity ignored: one volunteer can be assigned unlimited students.
5. Every export from `app/actions.ts` (a `"use server"` file) is a public endpoint. Today each starts with a role check; new admin actions must follow the same rule, enforced by a test (section 8).
6. Layout-level auth alone is unsafe: shared layouts are not re-rendered on every navigation (`staleTimes.md`, partial rendering). Guards must also be in each page, data function and action.
7. `proxy.ts` only authenticates (`proxy.ts:1-11`); no role routing, which is acceptable only because of per-page guards.
8. Existing e2e tests are coupled to the single `/admin` page (tabs "Buddy matching", `.queue-card`); restructuring needs the test edits in section 9.
9. Student actions call `revalidate("/admin")` (`actions.ts:69, 102, 119, 134, 183`); new sub-routes need the same.

---

## 2. Decisions

| # | Decision | Justification |
|---|---|---|
| D1 | Roles granted in the UI: `student` and `isc_admin` only. `welfare_staff` can never be granted, revoked, or edited from the admin UI; stays operator-only (`pnpm db:set-role`). | Welfare staff are UTM-authorised, not club members; a yearly-changing student committee must not be able to mint welfare access. Matches the deck: "restrict welfare records to authorised staff". |
| D2 | Nobody changes their own role; no "last admin" can be removed via UI (self-change blocked, so at least the actor remains). | Prevents accidental lockout. Dashboard warns when fewer than 2 admins exist. |
| D3 | Welfare staff get NO committee powers and no `/admin` access. | Least privilege; they have their own workspace. |
| D4 | Admin sees welfare data only as ONE aggregate: counts of enquiries by status (and acknowledgement share). No ids, categories, dates, text. | Needed for the "response acknowledgement" KPI; no personal data. Flag to the team if even a count is judged too much: the KPI card can be removed without other impact. |
| D5 | "Volunteer" = a `volunteers` row, not a role. Add approval + pause. Only approved, unpaused volunteers are assignable. Existing volunteer rows are backfilled as approved by the migration. | Deck calls volunteers a role, but modelling it as a profile role would let one user be both volunteer and admin awkwardly; the table already exists. |
| D6 | Housing outcomes: `verified` (refresh date, resolve all open reports) or `dismissed` (note required, date NOT refreshed). | Smallest change that fixes the false-report problem. No listing editing or "contact owner": listings have no owner contact column. Listing content is CMS territory. |
| D7 | Audit log is append-only by convention (no update/delete code path), written in the same DB batch as the mutation, never storing welfare content or free-text personal data. | Atomic and cheap; neon-http has no interactive transactions but supports `db.batch` (`drizzle-orm/neon-http/session.d.ts:49`). |
| D8 | Deactivating users is out of scope for v1. | Better Auth's admin plugin types include `banUser` and a `banned` field (`@neondatabase/auth` dist types), but whether Neon Auth managed enables the admin plugin is unverified. Spike (5.4) decides. Fallback today: remove access via role -> student and Neon console. |
| D9 | New code lives in new files; admin CSS in its own file imported by the admin layout. | Avoids collisions with the CMS planner and the 3,454-line `globals.css`. |
| D10 | `/admin` becomes the dashboard. The three old tabs move to routes. The "Publish update" form is extracted unchanged to `/admin/publish` until the CMS replaces it. | No loss of function during the transition; test 5b keeps working with a one-line path change. |

---

## 3. Information architecture

### 3.1 Routes

| Route | Purpose | Nav label | Mobile bottom nav |
|---|---|---|---|
| `/admin` | Dashboard: needs attention + KPIs + recent activity | Dashboard (icon `home`) | slot 1 |
| `/admin/housing` | Reports queue, stale listings, resolved history | Housing (`housing`) | slot 2 |
| `/admin/buddies` | Requests + volunteers | Buddies (`buddy`) | slot 3 |
| `/admin/people` | Users, roles, members, exports | People (`globe`) | slot 4 |
| `/admin/publish` (temporary) then `/admin/content` (CMS) | Club updates / content | Updates / Content (`updates`) | slot 5 |
| `/admin/activity` | Audit feed | Activity (`clock`) | sidebar only (6th; bottom nav slices to 5, linked from dashboard) |
| `GET /api/admin/export/[kind]` | CSV: `members`, `volunteers`, `kpis` | n/a | n/a |

Existing icons only (`components/icons.tsx`); no icon edits.

Shared files under each route: `page.tsx` (server, guard + data), a small client component for interactive parts (matches `Admin.tsx` pattern: `useShell().report`, `useTransition`).

### 3.2 Guards (defense in depth, all four layers)

1. `app/(app)/admin/layout.tsx`: `getViewer()`; not `isc_admin` -> `notFound()` (same behaviour as today for students; also hides existence from welfare staff).
2. Every `page.tsx`: repeat the check (layouts are not re-run on every client navigation).
3. Every data function in `lib/admin/data.ts`: `await requireAdmin()` which throws `Forbidden`.
4. Every action in `lib/admin/actions.ts` and the export route: gate returns `SIGNED_OUT` / `FORBIDDEN` (existing `ActionResult` pattern).

`lib/admin/guard.ts` (`import "server-only"`, no `"use server"`):

```ts
export async function adminGate(): Promise<{ ok: true; viewer: Viewer } | { ok: false; result: ActionResult }>;
export async function requireAdmin(): Promise<Viewer>; // throws Error("Forbidden")
```

Rule: only `lib/admin/actions.ts` has `"use server"`. Helpers live elsewhere so they are never callable endpoints.

### 3.3 States

- Loading: `app/(app)/admin/loading.tsx` renders 3 `.surface` skeleton blocks (`.adm-skel`). `AppLayout` already wraps children in `Suspense` (`app/(app)/layout.tsx:8`), so this only polishes sub-route transitions.
- Error: `app/(app)/admin/error.tsx` (client) with generic message and a "Try again" `Action`. Never print `error.message` (could leak SQL).
- Empty: reuse `.surface.empty-state` (exists at `globals.css:1526`) with icon, one sentence, optional link, as in `Admin.tsx:95-102`.
- Action feedback: `useShell().report(result, fallback)` toasts (existing).
- Destructive or sensitive actions (role change, reassign, close, export, dismiss): `Modal` from `components/Modal.tsx` with explicit confirm button. Focus trap and Escape already handled.

### 3.4 Navigation wiring (edit to `components/AppShell.tsx`)

```ts
import { adminNav } from "@/lib/admin/nav";
const navItems = viewer.role === "isc_admin" ? adminNav : workspace ? [workspace] : navigation;
const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
// currentTitle: viewer.role === "isc_admin" ? adminNav.find(n => isActive(n.href))?.page : ...existing
```
Replace `pathname === item.href` in the sidebar (`~:191-199`) and bottom nav (`~:298-310`) with `isActive(item.href)`. Welfare staff and students keep current behaviour. The `home` link (`:101`) stays `/admin` for admins.

`lib/admin/nav.ts`: `export const adminNav: { page; href; short; icon: IconName }[]` in the order of 3.1. Ownership: admin implementer creates it with the 5 entries above and Updates -> `/admin/publish`; the CMS implementer changes exactly that one entry to `{ page: "Content", href: "/admin/content", short: "Content", icon: "updates" }` when its pages land, and deletes `/admin/publish`.

---

## 4. Data model (additive only)

Production DB is live and shared with tests. Every change below is `ADD COLUMN` with a default or nullable, or `CREATE TABLE`. No drops, renames, or type changes.

### 4.1 New file `lib/db/schema-admin.ts`

```ts
import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id").notNull(),            // Neon Auth user id, or "cli"
  actorName: text("actor_name").notNull(),        // snapshot: committee members change yearly
  actorRole: text("actor_role").notNull(),        // "isc_admin" | "operator"
  action: text("action").notNull(),               // "housing.verify" ... see 6.4
  entityType: text("entity_type").notNull(),      // "listing" | "buddy_request" | "volunteer" | "user" | "update" | "export" | ...
  entityId: text("entity_id"),
  summary: text("summary").notNull(),             // one plain sentence, <= 200 chars, shown in the feed
  detail: jsonb("detail").$type<Record<string, string | number | boolean | null>>(), // small before/after, scalars only
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_log_created_idx").on(t.createdAt.desc()),
  index("audit_log_entity_idx").on(t.entityType, t.entityId),
  index("audit_log_actor_idx").on(t.actorId),
]);
```

`action` is `text`, not a pgEnum, so the CMS (and later work) can add actions with no migration. No other indexes: data volume is club-sized.

### 4.2 Edits to `lib/db/schema.ts` (columns on existing tables; admin implementer, one commit, Phase 0)

```ts
// housingReports: add
outcome: text("outcome"),                    // null until resolved: "verified" | "dismissed" (legacy rows stay null)
resolutionNote: text("resolution_note"),
resolvedBy: text("resolved_by"),
resolvedAt: timestamp("resolved_at", { withTimezone: true }),

// volunteers: add
approvedAt: timestamp("approved_at", { withTimezone: true }),   // null = pending
approvedBy: text("approved_by"),
paused: boolean("paused").notNull().default(false),

// buddyRequests: add
assignedAt: timestamp("assigned_at", { withTimezone: true }),
assignedBy: text("assigned_by"),
closedAt: timestamp("closed_at", { withTimezone: true }),       // completed/closed requests free up capacity

// welfareEnquiries: add (Phase 6, optional, see 5.6)
acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
```

Hand-appended backfill in the generated migration (drizzle-kit emits DDL only):
```sql
UPDATE volunteers SET approved_at = now(), approved_by = 'migration' WHERE approved_at IS NULL;
```
so seed volunteers (e2e test 4 assigns "Sameer Seebaluck") and any real pre-pilot volunteers stay assignable. Legacy `resolved = true` housing rows keep `outcome = NULL` and render "Resolved (before audit)".

Capacity load for a volunteer = `count(buddy_requests where volunteer_id = v.id and closed_at is null)`.

### 4.3 Wiring and migration process

| File | Change | Who |
|---|---|---|
| `lib/db/schema.ts` | append one line `export * from "./schema-admin";` (the CMS plan does the same with `./cms-schema`; drizzle-kit follows the re-export, and `lib/db/index.ts` already does `export * from "./schema"`) | admin implementer, Phase 0 |
| `drizzle.config.ts`, `lib/db/index.ts` | NO edit (reconciled with `cms.md` section 12: re-export through `schema.ts`, no glob) | n/a |

Migration rules (both planners; same rule as `cms.md` section 12): the CMS migration must not contain `audit_log` and this one must not contain CMS tables. One agent at a time runs `pnpm db:generate`; the second rebases first, then generates, because both would otherwise produce `0002_*` and clash in `drizzle/meta/_journal.json` and the snapshot. Never hand-merge snapshots. Before `pnpm db:migrate` on the live DB, create a restore point: `NEON_PROFILE=utm neon branches create ...` (confirm `neon me` shows anesu.mupesa@umail.utm.ac.mu first, per `AGENTS.md`).

Verify in Phase 0 that drizzle-kit follows the `export *` (`pnpm db:generate` should list only the audit table and the new columns). If it does not, switch `drizzle.config.ts` to the array form `["./lib/db/schema.ts", "./lib/db/schema-admin.ts", "./lib/db/cms-schema.ts"]` (one shared edit, done by the integration implementer).

---

## 5. Feature specs

### 5.1 Dashboard (`/admin`)

Server component, one data function `getDashboard(range)`; `range` from `?range=7|30|all` (default 30) via server-rendered chips (links, no client JS). All numbers in SQL, Mauritius time (`at time zone 'Indian/Mauritius'`, same as `data.ts:63`). No chart library: tiles + a small table with CSS bars (`.adm-bar`, width as inline %).

**Needs attention** (top, each row a link, count badge, hidden when 0 with an "All clear" line if all are 0):

| Item | SQL basis | Links to |
|---|---|---|
| Open housing reports | `housing_reports where not resolved` | `/admin/housing` |
| Stale listings (>30 days) | `listings where checked_at < today - 30` | `/admin/housing?tab=stale` |
| Unmatched buddy requests, with earliest arrival date | `buddy_requests where volunteer_id is null and closed_at is null` | `/admin/buddies?status=pending` |
| Volunteers awaiting approval | `volunteers where approved_at is null` | `/admin/buddies?tab=volunteers` |
| Unacknowledged welfare enquiries: COUNT ONLY | `select count(*) from welfare_enquiries where status = 'Submitted'` | none (not a link; admins cannot open it) |
| Fewer than 2 ISC admins | `profiles where role='isc_admin'` < 2 | `/admin/people` |

**KPIs** (the pilot measures; label each with its deck source):

| KPI | Definition | Source slide |
|---|---|---|
| Arrival guide use | distinct students with >=1 `arrival_progress` row / students in range; "new arrivals" = profiles created in range | 8 (SDG 4) |
| Task completion | ticks / (active students x total tasks), as % | 9 |
| Buddy requests matched | matched / total requests in range; median hours to match (rows with `assigned_at`) | 8 (SDG 10) |
| Buddy participation | approved volunteers; % with >=1 current match; open capacity left (sum capacity of approved, unpaused, minus load) | 9 |
| Housing reports resolved | resolved / total in range; median days to resolve (rows with `resolved_at`); oldest open report age | 8 (SDG 16) |
| Housing Hub feedback | reports in range by reason (4 reasons); % of listings checked in last 30 days | 9 |
| Student uptake | total students; new in range; % with a membership row | 9 |
| Response acknowledgement | aggregate only: total enquiries, % no longer "Submitted"; if `acknowledged_at` exists (5.6): % acknowledged within 48 h | 9 |

**Trend table** (weekly, last 8 weeks, via `generate_series` left join): new students, buddy requests, housing reports. Rendered as a 4-column table with `.adm-bar` cells.

**Recent activity**: latest 5 audit rows + "See all".

CSV `kpis` (5.5) exports the same figures plus the weekly table: aggregate only, no personal data, intended for the UTM pilot report.

Performance: ~8 small aggregate queries; fetch with `Promise.all` (each is one HTTP call on neon-http). Not cached (admin only, low traffic). If slow, collapse into one `select` with scalar subqueries.

### 5.2 Housing moderation (`/admin/housing`)

Tabs (server-driven via `?tab=`): **Reports** (default, count), **Stale** (count), **Resolved** (last 30, with outcome, note, who, when).

Reports tab: one card per listing with open reports. Card shows ALL open reports (fixing `data.ts:68`): reason, note, age ("3 days ago"), photo thumbnail (presigned URL from `uploads.url(key, { expiresIn: 600 })`, as `data.ts:69`; `<img loading="lazy">` 96px, tap opens full link). Reporter identity is NOT shown (data minimisation).
Buttons: **Verify & Refresh Date** (label kept; existing tests rely on it) and **Dismiss report...** (Modal with required note, "date will not change"). Both resolve every open report for that listing and write audit.

Stale tab: listings past 30 days with no open report; button **Verify & Refresh Date** (this is the missing path in 1.2). Sort oldest first.

Footnote kept: "Only refresh a listing after confirming the contact, price and availability."

### 5.3 Buddy matching (`/admin/buddies`)

Tabs: **Requests** (chips Pending / Matched / Closed), **Volunteers**.

Requests: card as today (name, country, language, programme, help tags, arrival date) plus a badge "Arrives in N days" (warning when <= 7). Pending: volunteer `<select>` listing only approved, unpaused volunteers as `Name · 1/2 used · English, French`; full ones `disabled`; a language match hint (`✓ speaks Hindi`) computed by `volunteer.languages` containing `request.language`. Matched: "Matched with X" + **Reassign** (Modal confirm, re-shows select) + **Unassign** + **Close request** (Modal, "frees X's capacity").

Volunteers: card per volunteer: name, course, languages, email, load/capacity, status badge (Pending / Approved / Paused). Buttons: **Approve** (pending), **Pause** / **Resume** (approved), capacity `<select>` 1-5 (server rejects values below current load). Note under the list: "Volunteer emails are shared with the matched student."

Student-facing change: none (the student `/buddy` page keeps reading the latest request and its volunteer, `data.ts:126-137`).

### 5.4 People & roles (`/admin/people`)

- Search (plain GET form on `q`, matches name or email, case-insensitive) + chips: All / Committee / Members / Volunteers. 25 per page, `?page=`.
- Rows: name, email, role badge, joined (Mauritius date), tags (Member, Volunteer).
- **Change role** button on student and isc_admin rows only, not on your own row ("You"), and not on welfare rows (shows "Managed by operator"). Modal states plainly what the role can see ("ISC Admin: all member names and emails, housing reports, buddy matching. Not welfare enquiries."). Confirm button.
- Export buttons: Members CSV, Volunteers CSV, each through a confirm Modal (5.5).
- Static footer note for handover: "Handover: promote the incoming committee, then demote the outgoing one. Keep at least two admins. Welfare staff access is set by the platform operator."
- Join: `profiles` LEFT JOIN `neon_auth."user"` (email, created_at) via `db.execute(sql...)`. Same schema the CLI already reads (`set-role.ts:17`). Phase 0 task: run `select column_name from information_schema.columns where table_schema='neon_auth' and table_name='user'` and confirm `email`, `createdAt` (or `created_at`) names; also confirm whether `banned` exists (feeds D8).
- Deactivate spike (Phase 7, optional): try `auth.admin.banUser` on a throwaway test user. If it works, add a "Suspend" action; if not, record in this plan as unsupported.

### 5.5 CSV exports (`GET /api/admin/export/[kind]`)

Route handler `app/api/admin/export/[kind]/route.ts` (GET handlers are dynamic by default in Next 16; do not add `export const dynamic`, which `cacheComponents: true` rejects). Steps: `adminGate()` (401/403 plain response for failures, no body detail), validate `kind`, query, stream CSV, write audit entry `export.<kind>` with row count (never contents).

| kind | columns | rationale |
|---|---|---|
| `members` | name, email, programme, registered date | the minimum for membership admin |
| `volunteers` | name, email, course, languages, capacity, status | matching and follow-up |
| `kpis` | metric, period, value | aggregate, no personal data |

Hygiene: UTF-8 BOM (Excel), `Content-Disposition: attachment; filename="isc-members-2026-11-26.csv"`, `Cache-Control: no-store`, spreadsheet-injection guard (prefix `'` to cells starting `=`, `+`, `-`, `@`, tab), RFC 4180 quoting. Confirm Modal text: "This file contains personal data. Use it only for ISC membership business, keep it in the club-owned drive, delete it when finished." No housing-report or buddy-request exports (they carry student detail with little benefit).

### 5.6 Optional welfare-side change (response acknowledgement time)

Add `welfare_enquiries.acknowledged_at` and in `updateEnquiryStatus` set `acknowledgedAt: sql\`coalesce(acknowledged_at, now())\`` when `status !== "Submitted"`. One column, one line in `actions.ts:211`. Skip if the welfare owner objects; the dashboard then shows only the status share. This is the single admin-plan touch to welfare code, so it is isolated in Phase 6 and needs the owner's OK.

### 5.7 Activity feed (`/admin/activity`)

Newest first, 30 per page, "Load older" (`?before=<id>` cursor), filter chips by entity type. Row: time (Mauritius), actor name, summary sentence, small entity badge. No raw JSON shown to users. Welfare activity is never in this log (6.1 enforces it).

---

## 6. Server API

Everything below follows existing patterns (`app/actions.ts:23-34`): `fail()`, `SIGNED_OUT`, `FORBIDDEN`, `ActionResult`, `text()`, `isId()`, `revalidate()`. Because `app/actions.ts` does not export them, `lib/admin/util.ts` re-declares the same four tiny helpers (shared edit to export them is avoided on purpose).

### 6.1 Audit helper (`lib/admin/audit.ts`, `server-only`, no `"use server"`)

```ts
export type AuditInput = {
  actorId: string; actorName: string; actorRole?: string;   // object form, matches the adapter the CMS plan expects
  action: string;                    // "<domain>.<verb>", e.g. "housing.verify"
  entityType: string;                // must NOT start with "welfare"
  entityId?: string | number;
  summary: string;                   // 1..200 chars, no free text from students
  detail?: Record<string, string | number | boolean | null>;
};
/** Returns an un-awaited insert for use inside db.batch([...mutation, auditEntry({ actorId: viewer.userId, actorName: viewer.name, ... })]). Throws on a violated rule. */
export function auditEntry(e: AuditInput): ReturnType<typeof db.insert>;
export async function logAudit(e: AuditInput): Promise<void>;   // standalone: exports, and the CMS (its neon-http code has no batch)
```

CMS mutations call `logAudit({ actorId, actorName, action, entityType, entityId, summary })` (their adapter `lib/cms/audit.ts` re-exports it), or `auditEntry` inside a `db.batch`. `actorRole` defaults to `isc_admin`. Convention: `action` values `content.*` belong to the CMS.

### 6.2 Actions (`lib/admin/actions.ts`, `"use server"`)

Each begins with `const g = await adminGate(); if (!g.ok) return g.result;`.

| Action | Validation | Writes (one `db.batch`) | Audit action | Revalidate |
|---|---|---|---|---|
| `reviewListing(listingId, outcome: "verified" \| "dismissed", note?)` | id; listing exists; `dismissed` needs note 3-500 chars and >=1 open report; `verified` note optional | verified: `listings.checked_at = today`; both: all open reports -> `resolved, outcome, resolution_note, resolved_by, resolved_at` | `housing.verify` / `housing.dismiss` | `/`, `/housing`, `/admin`, `/admin/housing`, `/admin/activity` |
| `assignBuddyMatch(requestId, volunteerId)` | ids; request not closed; volunteer approved, unpaused, load < capacity (re-read in same request; race window accepted for a club); if already assigned to a different volunteer this is a reassign | `volunteer_id, assigned_at, assigned_by` | `buddy.assign` / `buddy.reassign` (detail: from/to volunteer id) | `/`, `/buddy`, `/admin/buddies`, `/admin`, `/admin/activity` |
| `unassignBuddy(requestId)` | request exists and assigned | `volunteer_id = null, assigned_at = null, assigned_by = null` | `buddy.unassign` | same |
| `closeBuddyRequest(requestId)` | request exists, not already closed | `closed_at = now()` | `buddy.close` | same |
| `setVolunteerStatus(volunteerId, "approve" \| "pause" \| "resume")` | id; transitions valid | `approved_at/approved_by` or `paused` | `volunteer.approve` / `.pause` / `.resume` | `/buddy`, `/admin/buddies`, `/admin`, `/admin/activity` |
| `setVolunteerCapacity(volunteerId, capacity)` | integer 1-5 and >= current load | `volunteers.capacity` | `volunteer.capacity` (detail: from/to) | same |
| `setUserRole(userId, role: "student" \| "isc_admin")` | target exists in `profiles`; target != actor; target current role in {student, isc_admin}; new role in the same set; `welfare_staff` either side -> `fail("Welfare staff access is managed by the platform operator.")` | `profiles.role` | `user.role_change` (detail: from/to; summary names the user, not their email) | `/admin/people`, `/admin`, `/admin/activity` |

Read-only events:
- Export route calls `logAudit(...)` with `action: "export.members"`, `entityType: "export"`, `detail: { rows: n }`.

Changes to existing student actions in `app/actions.ts` (shared edit, admin implementer):
- `reportListing`, `requestBuddy`, `volunteerAsBuddy`, `publishUpdate`: replace `revalidate(..., "/admin")` with `revalidatePath("/admin", "layout")` so every admin sub-route refreshes (`actions.ts:69, 102, 119, 183`). Keep the CMS-owned `/admin/content/**` unaffected (harmless extra refresh).
- `publishUpdate` (`:170-185`): wrap in `db.batch([insert, auditEntry({...})])` with `update.publish` until the CMS replaces it.
- Remove `verifyListing` and `assignBuddy` once the new UI and tests are live (Phase 2 end). Until then keep them to avoid breaking the old page mid-migration.
- `volunteerAsBuddy`: no code change needed (new rows default to pending). Student copy at `actions.ts:120` ("received by the committee") is already accurate; the student `/buddy` page may later show "pending approval" (out of scope; mention to the student-side owner).

### 6.3 Data functions (`lib/admin/data.ts`, `server-only`, each starts `await requireAdmin()`)

| Function | Returns |
|---|---|
| `getDashboard(range: 7 \| 30 \| "all")` | `{ attention, kpis, weekly }` as in 5.1 |
| `getHousingQueue()` | listings with ALL open reports + photo URLs (admin only) |
| `getStaleListings()` | unreported stale listings |
| `getResolvedReports(limit = 30)` | history with outcome, note, resolver name (join `profiles`) |
| `getBuddyBoard(status)` | requests + assigned volunteer + arrival-in-days |
| `getVolunteerBoard()` | volunteers + load, status |
| `getPeople({ q, filter, page })` | rows + total (join `neon_auth."user"`, `memberships`, `volunteers`) |
| `getActivity({ entityType?, before? })` | audit rows |
| `getExportRows(kind)` | rows for the CSV route |

Not touched: `lib/data.ts` (existing `getListings`, `getBuddyRequests`, `getVolunteers` stay for the student pages and old code until removal). New types go in `lib/admin/types.ts` (no edit to `lib/types.ts`). Date formatting helper in `lib/admin/format.ts` (the one in `data.ts:18-25` is not exported).

### 6.4 Audit action catalogue (initial)

`housing.verify`, `housing.dismiss`, `buddy.assign`, `buddy.reassign`, `buddy.unassign`, `buddy.close`, `volunteer.approve`, `volunteer.pause`, `volunteer.resume`, `volunteer.capacity`, `user.role_change`, `update.publish`, `export.members`, `export.volunteers`, `export.kpis`, `role.cli` (from `set-role.ts`), CMS: `content.*`.

`scripts/set-role.ts`: after the upsert, also insert an `audit_log` row (`actor_id = 'cli'`, `actor_name = 'Operator (CLI)'`, `actor_role = 'operator'`, `action = 'role.cli'`, summary "Role set to X for <name>"). Run only after the migration. Same account rule applies.

---

## 7. UI

Reuse: `PageHeading`, `Badge` (tones positive / warning / stale / neutral), `Action` (variants `navy`, `primary`, `outline`, `small`), `TextLink`, `Modal`, `Icon`; classes `surface`, `queue-list`, `queue-card`, `section-heading`, `report-summary`, `help-tags`, `assign-row`, `spread-actions`, `empty-state`, `info-banner`, `tabs compact`, `tab-count`, `form-card`, `small-text`, `mono`, `text-link`. All existing mobile rules (`.queue-card .spread-actions` stacks at `globals.css:3122`) apply.

New CSS goes in `app/(app)/admin/admin.css`, imported from `app/(app)/admin/layout.tsx`. All classes prefixed `adm-`. CMS uses its own prefix.

### 7.1 New classes

| Class | Purpose |
|---|---|
| `.adm-grid` | 2-col grid at 360px, 4-col at >=1024px (KPI tiles) |
| `.adm-tile` (`.surface` child): big number, label, sub-label | KPI tile |
| `.adm-attn` | attention row: icon, label, count badge, chevron; `min-height: 48px` |
| `.adm-bar`, `.adm-bar > i` | inline CSS bar for trends |
| `.adm-chips` | horizontally scrollable filter chips, each `min-height: 44px` |
| `.adm-row` | people/activity row; card layout on mobile, table-like grid at >=1024px |
| `.adm-thumb` | 96px evidence thumbnail, `object-fit: cover`, border radius as `.surface` |
| `.adm-skel` | loading skeleton |
| `.adm-actions` | button group: stacked full-width <768px, inline otherwise |

Touch rule: every interactive control in admin.css gets `min-height: 44px; min-width: 44px`. No horizontal page scroll at 360px; long emails use `overflow-wrap: anywhere`.

### 7.2 Wireframes

Dashboard, 360px:
```
[ Committee ]                       <- PageHeading (eyebrow, title, short desc)
[7 days][30 days][All]              <- .adm-chips
+ Needs attention ---------------+
| ! 3  Open housing reports    > |  .adm-attn rows, tap = link
| ! 2  Stale listings (>30d)   > |
| ! 4  Unmatched buddy requests> |
|   1  Volunteers to approve   > |
|   2  Welfare enquiries waiting |  count only, no link
+--------------------------------+
+ Pilot KPIs -------------------+
| [Arrival use] [Task compl.]    |  .adm-tile 2-col
|  62%           41%             |
| [Buddy match] [Participation]  |
| [Housing res.] [Feedback]      |
| [Uptake]      [Ack. rate]      |
+--------------------------------+
Weekly trend  (table + bars)
Recent activity (5 rows) [See all]
[ bottom nav: Home Housing Buddies People Updates ]
```
Desktop: attention card and KPI grid side by side (attention left 1/3, KPI right 2/3, 4 tiles per row), trend table full width, activity beneath.

Housing, 360px:
```
Housing                      <- PageHeading
[Reports 3][Stale 2][Resolved]        <- .tabs compact (scrolls)
+ ISC / 004  [Under review] -----+
| Bright apartment near market   |
| La Tour Koenig . Rs 9,500      |
| Report 1: Rent price changed   |
|   "now Rs 10,000" . 2d ago     |
|   [thumb]                      |
| Report 2: Contact unreachable  |
| Last checked: 20 Oct 2026      |
| [ Verify & Refresh Date      ] |  full width, 48px
| [ Dismiss report...          ] |
+--------------------------------+
```
Desktop: same cards, actions inline on the right (`.spread-actions`), two-column card grid not needed.

Buddies, 360px: tabs, chips (Pending 4 / Matched 6 / Closed 2), request cards as 5.3, volunteer cards with status badge and stacked buttons. Desktop: unchanged card list, `assign-row` inline.

People, 360px:
```
[ search by name or email  ][Go]
[All][Committee][Members][Volunteers]
[Export members CSV][Export volunteers CSV]  <- stacked
+ Anesu M.            [ISC Admin] +
| a@umail.utm.ac.mu               |
| Joined 02 Sep 2026 . Member     |
| You                             |
+ Sam K.               [Student]  +
| ...  [ Change role ]            |
```
Desktop (>=1024): `.adm-row` becomes a table-like grid: Name / Email / Role / Joined / Tags / Action.

Activity, 360px: filter chips, then list rows `12:41 . Anesu M.` newline `Verified listing "Bright apartment"` newline entity badge. Load older button.

### 7.3 Copy and accessibility

- Remove "DEMO WORKSPACE" from the eyebrow; keep the committee/welfare separation banner on the dashboard.
- Modals use the existing `Modal` (focus trap, Escape). Role badges use text, not colour alone.
- Plain English strings, consistent with the deck's "plain, simple to scan and mobile-first" principle (slide 7).

---

## 8. File ownership and conflict map

Another planner owns the CMS (content editing under `app/(app)/admin/content/**` and content tables).

### 8.1 New files: owner = admin implementer

```
lib/db/schema-admin.ts
lib/admin/{guard,audit,data,actions,util,format,nav,types}.ts
app/(app)/admin/layout.tsx          admin guard + admin.css import
app/(app)/admin/admin.css
app/(app)/admin/{loading,error}.tsx
app/(app)/admin/page.tsx            (replaced: dashboard)
app/(app)/admin/Dashboard.tsx       (replaces Admin.tsx)
app/(app)/admin/housing/{page.tsx,HousingQueue.tsx}
app/(app)/admin/buddies/{page.tsx,BuddyBoard.tsx}
app/(app)/admin/people/{page.tsx,People.tsx}
app/(app)/admin/activity/page.tsx
app/(app)/admin/publish/{page.tsx,PublishForm.tsx}   temporary, CMS deletes
app/api/admin/export/[kind]/route.ts
tests/admin.spec.ts
```
`app/(app)/admin/Admin.tsx` is deleted by the admin implementer when its three tabs have moved.

### 8.2 Edits to shared files

| File | Edit | Who | When |
|---|---|---|---|
| `lib/db/schema.ts` | add columns in 4.2 (housing_reports, volunteers, buddy_requests; welfare_enquiries in Phase 6) + `export * from "./schema-admin"` | admin | Phase 0 (different region from the CMS edits; never run `db:generate` concurrently) |
| `lib/db/index.ts`, `drizzle.config.ts` | none | n/a | n/a |
| `drizzle/*` | generated migration `0002_*` + hand-appended backfill | admin generates first; CMS rebases and generates `0003_*` | Phase 0 / CMS |
| `components/AppShell.tsx` | admin nav + active matching + title (3.4) | admin | Phase 0 |
| `app/actions.ts` | revalidate paths, `publishUpdate` audit, remove `verifyListing`/`assignBuddy`, optional `acknowledgedAt` | admin | Phases 1, 2, 6 |
| `app/globals.css` | NO edit (admin CSS in `admin.css`; the CMS appends its `cms-*` block there, no overlap) | n/a | n/a |
| `lib/data.ts`, `lib/types.ts`, `package.json` | NO edit | n/a | n/a |
| `lib/admin/nav.ts` | one entry (Content) swapped | CMS | after its pages exist |
| `scripts/set-role.ts`, `scripts/reset-e2e.ts` | audit row; reset additions (section 9) | admin | Phase 6 |
| `tests/flows.spec.ts` | path edits for old `/admin` tabs; `tests/roles.ts` optional viewport param | admin | Phases 1-2 |

### 8.3 Boundary with the CMS

- The CMS must NOT write to `audit_log` directly; it imports `auditEntry` from `lib/admin/audit.ts` and uses `db.batch`.
- The CMS must put `adminGate()` first in every action and `requireAdmin()` in every data function (same module).
- The CMS owns `/admin/content/**` pages and tables; the admin layout guard and `admin.css` already cover them.
- The CMS owns the "Publish update" function: it replaces `/admin/publish` and `publishUpdate`, and swaps the nav entry. UTM-approval recording for official content belongs to the CMS spec.
- Audit feed entity badge for CMS actions is derived from `entityType` and needs no admin change.
- `reconcile with docs/plans/cms.md`: see section 12 (checked at the time of writing).

---

## 9. Test plan (Playwright, extend `tests/flows.spec.ts` patterns)

Accounts: `E2E_STUDENT`, `E2E_ADMIN`, `E2E_WELFARE` from `.env.local`, via `pageAs(browser, role)` (`tests/roles.ts:23`). New file `tests/admin.spec.ts`; admin-owned. Run on the `desktop` project for flows that create records (same `desktopOnly()` pattern as `flows.spec.ts:6`); the layout checks run at 360x740 by giving `pageAs` an optional viewport argument.

Existing tests to edit:
- test 2-3 (`flows.spec.ts:25`): `admin.goto("/admin/housing")`.
- test 4 (`:64`): `admin.goto("/admin/buddies")`, drop the tab click; the "Sameer Seebaluck" option must still be selectable (backfill makes him approved).
- test 5b: `/admin/publish`.
- photo test (`:226`): `/admin/housing`.
- "student is kept out of staff workspaces" (`:218`): extend path list with the new routes.

New tests:

| # | Flow | Key assertions |
|---|---|---|
| A1 | Admin dashboard | heading, attention rows, 8 KPI tiles present; page HTML contains no `WLF-` and none of the 5 enquiry category names; a "Welfare enquiries waiting" count is a number, not a link |
| A2 | Negative role matrix | for each of `/admin`, `/admin/housing`, `/admin/buddies`, `/admin/people`, `/admin/activity`, `/admin/publish`: student -> 404 text; welfare_staff -> 404 and no admin nav; admin -> `/welfare-staff` 404 still holds; student and welfare `request.get('/api/admin/export/members')` -> 401/403 with no `@` in body |
| A3 | Source guard test | read `lib/admin/actions.ts` as text; every `export async function` body's first statement is `adminGate()`; every function in `lib/admin/data.ts` starts with `requireAdmin()`; `grep welfare_enquiries lib/admin` matches only `kpi` aggregate code (count expressions) |
| A4 | Housing | student reports -> admin sees reason + age; Dismiss without a note is rejected; dismiss with note keeps `Last checked` unchanged on student page; second report then Verify -> date is today; Activity shows both entries; Stale tab listing can be verified without any report |
| A5 | Buddy | new volunteer is Pending and absent from select; Approve -> present; capacity 1 plus second assignment -> option disabled and server rejects; reassign, unassign, close produce Activity rows; student `/buddy` reflects unassign |
| A6 | People/roles | search finds the student; promote the E2E student to ISC Admin (Modal confirm) -> student account can open `/admin`; demote in `finally`; no Change role button on own row or on the welfare row; role change appears in Activity with before/after |
| A7 | Export | admin downloads members CSV: BOM, header row, `Content-Disposition`, a `'`-prefixed injection cell (seed a membership name `=1+1` in a unit fixture); `export.members` appears in Activity with a row count |
| A8 | Audit privacy | after A4-A7, Activity page text contains no student note text, no `WLF`, no email addresses beyond actor names |
| A9 | Mobile 360 | on each admin route: `document.documentElement.scrollWidth <= 360`; all `.button`, `.adm-attn`, bottom-nav buttons have bounding height >= 44; bottom nav shows 5 admin items |

`pnpm db:reset-e2e` needs (extend `scripts/reset-e2e.ts`): delete `housing_reports` and `audit_log` rows for the E2E users' ids, `update profiles set role='student'` for the E2E student id (guards A6 failing mid-test), reset volunteers (existing line already deletes E2E volunteers). Tests that create records stay `desktopOnly()` and need a reset between runs, same as today. Because the Neon DB is shared with production, A4-A7 leave only audit rows attributed to E2E accounts, which the reset removes.

Verification commands per phase: `pnpm lint`, `pnpm build` (uses `next build`; Next 16 with Cache Components may reject uncached data outside Suspense, so confirm new pages render under the existing `Suspense` in `app/(app)/layout.tsx`), `pnpm test:e2e`.

---

## 10. Implementation order and checklist

Safety first: create a Neon restore branch (`NEON_PROFILE=utm`, check `neon me`) before running the migration on the live DB.

**Phase 0 Foundation** (blocks the rest; nothing visible changes)
- [ ] Read `node_modules/next/dist/docs` for: `route.md`, `forbidden`/`not-found`, `loading.md`, `error.md`, `layout.md` (partial rendering note).
- [ ] Verify `neon_auth."user"` columns (email, created timestamp, `banned`).
- [ ] `lib/db/schema-admin.ts`, schema.ts columns + re-export (no `index.ts` / `drizzle.config.ts` edits). `pnpm db:generate`, inspect SQL, append the volunteers backfill UPDATE, `pnpm db:migrate`.
- [ ] `lib/admin/{guard,audit,util,format,nav,types}.ts`.
- [ ] `app/(app)/admin/layout.tsx` + `admin.css` + `loading.tsx` + `error.tsx`.
- [ ] `AppShell.tsx` nav change (3.4). Old `/admin` page still works at this point (it is just the admin nav now).
- [ ] Extract the publish form to `/admin/publish`.

**Phase 1 Housing + Activity**
- [ ] `reviewListing`, `getHousingQueue`, `getStaleListings`, `getResolvedReports`; `/admin/housing`.
- [ ] `getActivity` + `/admin/activity`; `publishUpdate` audit; update `revalidate` calls.
- [ ] Edit existing tests 2-3, photo test; add A4, A8.

**Phase 2 Buddies**
- [ ] `assignBuddyMatch`, `unassignBuddy`, `closeBuddyRequest`, `setVolunteerStatus`, `setVolunteerCapacity`, board data, `/admin/buddies`.
- [ ] Edit test 4; add A5. Remove old `verifyListing`/`assignBuddy`, `Admin.tsx`.

**Phase 3 People, roles, exports**
- [ ] `getPeople`, `setUserRole`, `/admin/people`; export route, `logAudit`.
- [ ] A2, A6, A7. Update `reset-e2e.ts`.

**Phase 4 Dashboard**
- [ ] `getDashboard`, `/admin` (replace old page), attention rows, KPIs, weekly trend, `kpis` CSV.
- [ ] A1, A9. Replace "DEMO WORKSPACE" copy.

**Phase 5 Hardening**
- [ ] A3 source-guard test; `scripts/set-role.ts` audit row; mobile 360 pass on every route; `pnpm lint` + `pnpm build` + full `pnpm test:e2e` + `pnpm db:reset-e2e` rerun.

**Phase 6 Optional (needs owner OK):** `welfare_enquiries.acknowledged_at` + dashboard "within 48 h" figure.

**Phase 7 Optional spike:** Neon Auth `banUser`; add Suspend only if it works.

Phase 1-3 can be handed to separate implementers after Phase 0, because they touch different route folders; they all append to `lib/admin/actions.ts` and `data.ts` (split those into `actions-housing.ts` etc. if run in parallel, each with `"use server"` and the gate; `data.ts` likewise).

### What to verify at the end
- Student and welfare accounts cannot reach any `/admin/**` route or the export endpoint; admin cannot reach `/welfare-staff`.
- No admin code reads welfare columns except the aggregate counts (A3).
- Every mutation writes exactly one `audit_log` row (atomic with the change).
- Migration applied to the live DB changed no existing data except the volunteers backfill.
- 360px: no horizontal scroll; 44px targets; bottom nav fits 5 items.
- The CMS can add an action and an audit row using only `adminGate`, `auditEntry`, and the nav entry.

---

## 11. Out of scope (explicitly)

- Content editing, club-update drafts, UTM-approval workflow (CMS plan).
- Listing creation/edit/removal and landlord contact data (CMS/content).
- Welfare console improvements (student identity for staff, filters, notes, per-staff audit); only the optional `acknowledged_at` is touched.
- Deactivating accounts (spike only), password reset, impersonation.
- Notifications (email/push) to students or volunteers on match or dismissal.
- Charts library, scheduled reports, retention auto-delete jobs, per-year archive of requests.
- Two-person approval for admin grants.
- Backups UI (rely on Neon point-in-time restore; document in handover notes).
- Student-side UI for "volunteer pending approval" and for closed requests.

## 12. Reconciliation with `docs/plans/cms.md` (read 2026-11-26)

Agreed (both plans already say the same):
- ADM owns `/admin` shell, nav, dashboard, people/roles, audit table and page, housing-report and buddy moderation, CSV exports. CMS owns `app/(app)/admin/content/**` and the content tables.
- Prefixes `adm-*` / `cms-*`; `isc_admin` is the only editor role; welfare staff and students get no admin or CMS access.
- One migration chain: whoever lands first is `0002`, the other rebases and regenerates `0003`. No `audit_log` in the CMS migration, no content tables in this one.
- Tables are re-exported from `lib/db/schema.ts` (`./schema-admin`, `./cms-schema`); no `drizzle.config.ts` or `lib/db/index.ts` edits.

Changes this plan made to match the CMS plan: dropped the `schema*.ts` glob and the `index.ts` edit; `logAudit` takes the object form `{ actorId, actorName, action, entityType, entityId, summary }` that `lib/cms/audit.ts` expects; the Content nav entry stays in `lib/admin/nav.ts` (CMS rule 4).

Conflicts found and how to resolve them (for the integration implementer, INT, who does shared files sequentially as in `cms.md` section 12):
1. **`verifyListing`.** `cms.md` section 7 keeps `verifyListing` and adds `recordRevision('verify')`. This plan replaces it with `reviewListing(listingId, "verified" | "dismissed", note)` in `lib/admin/actions.ts` and deletes `verifyListing` from `app/actions.ts`. Resolution: `reviewListing` is the single housing-review action; INT adds one `recordRevision('verify' | 'dismiss')` call to it. The CMS housing editor's "Verify" button calls `reviewListing`.
2. **Published-only filter.** After CMS lands, listings have `status` and `deleted_at`. `getHousingQueue` (reports) queries listings by id regardless of status, so a report on an unpublished listing never vanishes (CMS rule 3); the Stale tab and the dashboard stale count add `status = 'published' and deleted_at is null` (INT, one line each).
3. **Publish update.** `/admin/publish` and `publishUpdate` are temporary. When the CMS `saveUpdate` is live, INT deletes `/admin/publish`, the old `publishUpdate`, and swaps the nav entry for `{ page: "Content", href: "/admin/content" }`. The audit entry from this plan's `publishUpdate` wrapper is replaced by the CMS `content.*` entries.
4. **Guard helpers.** CMS has `lib/cms/auth.ts requireAdmin()` returning `{ viewer } | { error }`; this plan has `adminGate()` (same shape, different name) and a throwing `requireAdmin()` in `lib/admin/guard.ts`. Different modules, same behaviour. The A3 source-guard test covers `lib/admin` only, so extend it to `app/(app)/admin/content/actions.ts`. Later cleanup: CMS imports `adminGate`.
5. **Four-eyes approvals.** CMS approval requires a second `isc_admin`. One admin can promote another here (D1/D2), so a single admin could mint an approver. Accepted: every promotion is audited and visible in Activity, and the dashboard warns when fewer than 2 admins exist. No extra safeguard.
6. **Shared files edited by both** (`app/actions.ts`, `scripts/reset-e2e.ts`, `components/AppShell.tsx`, `tests/*`): different regions; INT merges. `reset-e2e.ts` gets this plan's additions (housing_reports, audit_log, role reset) and the CMS cleanup loop.
7. **Revalidation.** This plan's student actions revalidate `/admin` with `"layout"`, which also covers `/admin/content/**`; the CMS paths in `cms.md` stay as they are.
