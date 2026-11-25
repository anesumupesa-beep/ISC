import type { CSSProperties } from "react";

export type IconName =
  | "home"
  | "arrival"
  | "housing"
  | "buddy"
  | "updates"
  | "shield"
  | "arrow"
  | "chevron"
  | "check"
  | "rain"
  | "pin"
  | "calendar"
  | "external"
  | "close"
  | "globe"
  | "book"
  | "mail"
  | "phone"
  | "lock"
  | "info"
  | "download"
  | "filter"
  | "flag"
  | "clock"
  | "logout"
  | "leaf"
  | "plus";

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  arrival: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2h6v2M9 10l1 1 3-3M9 16l1 1 3-3M15 10h1M15 16h1" />
    </>
  ),
  housing: (
    <>
      <path d="m2 10 10-7 10 7M5 8v13h14V8M9 21v-7h6v7M9 9h.01M15 9h.01" />
    </>
  ),
  buddy: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v2" />
    </>
  ),
  updates: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h10M7 11h4v6H7zM14 11h3M14 14h3M14 17h3" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15m-5-5 5 5-5 5" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  rain: (
    <>
      <path d="M6 15a4 4 0 0 1-1-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 2 9M8 18l-1 3m6-3-1 3m6-3-1 3" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  book: (
    <>
      <path d="M12 5C9 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-7-2-10 1Zm0 0v15" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  phone: <path d="m5 3 4 1 1 5-3 2c2 3 3 4 6 6l2-3 5 1 1 4c0 4-8 2-13-3S1 3 5 3Z" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10m-7 6h4" />
      <circle cx="8" cy="6" r="2" fill="currentColor" />
    </>
  ),
  flag: (
    <>
      <path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 3H4v18h5m4-14 5 5-5 5m-5-5h14" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20C-1 8 10 2 21 3c1 11-6 21-17 17Zm0 0L16 8" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
};

export function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
