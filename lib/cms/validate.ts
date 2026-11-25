// Pure validation helpers (no server-only, no I/O) so they can be unit-tested and shared with RichText.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trimmed text within [min, max] chars with control characters stripped; null when out of bounds. Newlines kept only if `multiline`. */
export function cleanText(v: unknown, max: number, min = 1, multiline = false): string | null {
  if (typeof v !== "string") return null;
  let s = v.replace(/\r\n?/g, "\n").replace(CONTROL, "");
  if (!multiline) s = s.replace(/\n/g, " ");
  s = s.trim();
  return s.length >= min && s.length <= max ? s : null;
}

/** https-only absolute URL (optionally mailto:/tel: for RichText). Returns the normalised URL, or null when unsafe. */
export function validateUrl(v: unknown, opts: { rich?: boolean } = {}): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > 500 || CONTROL.test(s) || /\s/.test(s)) {
    CONTROL.lastIndex = 0;
    return null;
  }
  CONTROL.lastIndex = 0;
  if (opts.rich && /^(mailto|tel):[^\s]+$/i.test(s)) return s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
  return u.href;
}

/** Real calendar date "YYYY-MM-DD" or null. */
export function validateDate(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}

/** "YYYY-MM-DDTHH:mm" typed in Mauritius time (UTC+4, no DST) to a Date; null if invalid or empty. */
export function parseMuDateTime(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  if (!validateDate(v.slice(0, 10))) return null;
  const d = new Date(`${v}:00+04:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date to the "YYYY-MM-DDTHH:mm" value of a datetime-local input, in Mauritius time. */
export function toMuInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(new Date(d).getTime() + 4 * 3600_000).toISOString().slice(0, 16);
}

const LINK_RE = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** Every [label](url) in a RichText body must be a safe link. Returns the first bad URL or null. */
export function firstBadLink(body: string): string | null {
  for (const m of body.matchAll(LINK_RE)) if (!validateUrl(m[2], { rich: true })) return m[2];
  return null;
}

export const isEnum = <T extends string>(list: readonly T[], v: unknown): v is T => list.includes(v as T);

/** Image type from the first bytes (never trust File.type or the client filename). */
export function sniffImage(b: Uint8Array): { mime: string; ext: string } | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a)
    return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}
