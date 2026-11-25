const TZ = "Indian/Mauritius";

/** "14 Nov 2026" in Mauritius time. */
export function formatDate(d: Date | string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" })
      .formatToParts(new Date(d)).map((x) => [x.type, x.value]),
  );
  return `${p.day} ${p.month} ${p.year}`;
}

/** "14 Nov 2026, 09:12" in Mauritius time. */
export function formatDateTime(d: Date | string): string {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(d));
  return `${formatDate(d)}, ${time}`;
}

/** "today", "3 days ago", "2 hours ago". */
export function timeAgo(d: Date | string, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000));
  if (mins < 60) return mins < 2 ? "just now" : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Today's date as YYYY-MM-DD in Mauritius time. */
export const todayMu = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
