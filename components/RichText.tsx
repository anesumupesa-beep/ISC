import type { ReactNode } from "react";
import { validateUrl } from "@/lib/cms/validate";
import "./rich.css";

// Restricted text format, no HTML anywhere: blank line = paragraph, "- " lines = bullets,
// **bold**, [label](https://... | mailto: | tel:). Everything else is literal text (React escapes it).
const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function inline(line: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(INLINE)) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={`${key}-${i}`}>{m[1]}</strong>);
    else {
      const href = validateUrl(m[3], { rich: true });
      if (!href) out.push(m[2]); // unsafe link: show the label only
      else {
        const host = href.startsWith("https:") ? new URL(href).hostname : "";
        out.push(
          <a key={`${key}-${i}`} href={href} target="_blank" rel="noopener noreferrer">
            {m[2]}
            {host && <span className="rich-host"> ({host})</span>}
          </a>,
        );
      }
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let bullets: string[] = [];
  const flushPara = () => {
    if (!para.length) return;
    const k = `p${blocks.length}`;
    blocks.push(
      <p key={k}>
        {para.flatMap((l, i) => [...(i ? [<br key={`${k}-br${i}`} />] : []), ...inline(l, `${k}-${i}`)])}
      </p>,
    );
    para = [];
  };
  const flushBullets = () => {
    if (!bullets.length) return;
    const k = `u${blocks.length}`;
    blocks.push(<ul key={k}>{bullets.map((b, i) => <li key={i}>{inline(b, `${k}-${i}`)}</li>)}</ul>);
    bullets = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushBullets(); continue; }
    if (/^- /.test(line)) { flushPara(); bullets.push(line.slice(2)); }
    else { flushBullets(); para.push(line); }
  }
  flushPara();
  flushBullets();
  return <div className={`rich ${className}`.trim()}>{blocks}</div>;
}
