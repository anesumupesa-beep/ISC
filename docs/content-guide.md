# ISC Connect content guide (for the committee)

This is how a new committee keeps ISC Connect current without a developer. Only people with the **ISC Admin** role can edit content. Students and welfare staff never see these screens.

Sign in, open **Admin**, then **Content** (`/admin/content`). It works on a phone.

## What you can edit

| Section | What it is | Notes |
|---|---|---|
| Arrival guide | The checklist tasks, grouped by stage | Use Up/Down to reorder inside a stage. The four stage names are fixed in code |
| Housing | Listings with price, area, contact, last-checked date and up to 3 photos | Press **Verified today** after you have phoned the landlord. It also closes open student reports |
| Club updates | Events, announcements, weather notices, membership news | Events need a date, time and venue. Optional link, pin, schedule and hide date |
| Quick links | The "Keep these close" links | https addresses only |
| Site pages | The About, Privacy and Contact windows | Until you publish your own text, the built-in text is shown. **Reset to default** goes back to it |

## Writing text

Plain text only. No HTML is ever shown as HTML (it appears as typed text).
- A blank line starts a new paragraph.
- A line starting `- ` becomes a bullet.
- `**bold**` makes bold text.
- `[label](https://address)` makes a link. Only `https://` (and `mailto:` / `tel:` inside text) is accepted. Students see the website name next to every link.

## Status: draft, live, scheduled, archived, deleted

- **Draft**: saved, students cannot see it.
- **Publish**: students see it straight away.
- **Schedule** (updates): set "Publish at" and/or "Hide on" under *More options*. No one has to come back to switch it on or off.
- **Unpublish** moves it to **Archived** (kept, hidden).
- **Delete** hides it everywhere but keeps it. Use the **Deleted** filter and **Restore** to bring it back as a draft. Nothing is erased from the app.
- Students who already opened a page may still see its old copy until they reconnect. Unpublishing is not a recall. For something urgent, publish a correcting update.

## Official Announcements need UTM approval

The spec says to obtain UTM approval before publishing official information. That sign-off happens outside the app (email or Student Affairs). The app records it:

1. Write the announcement and press **Submit for UTM approval**. It is hidden from students.
2. Get UTM's sign-off outside the app.
3. A **different** committee member opens the item and presses **Record UTM approval**, typing who at UTM approved, when, and any reference (5 to 200 characters). If the committee has only one admin, that person may approve their own item; the app shows a warning.
4. The announcement goes live with a **UTM approved** badge.

If you change the wording of a published Official Announcement it goes back to "Pending approval" and disappears until approved again.

## History and undo

Every change is saved as a version: who, when, what changed. Open **History** on any item, expand *See what changed* for old and new values, and **Restore this version**. Restoring adds a new version; nothing is rewritten. If two people edit at once, the second save is refused with a "Someone else changed this" notice and the typed text is kept for you to copy.

## Photos (housing)

JPG, PNG or WebP. Phone photos are shrunk automatically. Each needs a short description (for screen readers). No faces, ID documents or number plates. Use **Clean up unused images** on the Content page now and then to remove abandoned uploads.

## Go-live checklist

The seeded listings, updates and guide tasks were created for the demonstration and are marked **Sample**.
1. Content page, "Needs attention": review everything listed.
2. Replace the sample content with real content, or press **Mark as real** on items that are accurate.
3. Press **Archive all sample content** once real items are published.
4. Publish your own About, Privacy and Contact text. Have UTM review the wording (the built-in text still needs committee review).
5. Check housing "last checked" dates are within 30 days.

## For the next committee

- The platform needs no developer for content. Accounts: use club-owned accounts, never personal ones, so access survives handover. Give the new committee the **ISC Admin** role from the admin People page and remove the old one.
- This guide, `docs/plans/cms.md` and the History screens are the continuity record.
