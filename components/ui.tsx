import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";

export function Badge({
  children,
  tone = "positive",
}: {
  children: ReactNode;
  tone?: "positive" | "warning" | "stale" | "neutral";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Action({
  children,
  onClick,
  variant = "",
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button type={type} className={`button ${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** Arrow link: a real link when given `href`, otherwise a button. */
export function TextLink({
  children,
  href,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  if (href)
    return (
      <Link className="text-link" href={href} onClick={onClick}>
        {children}
        <Icon name="arrow" size={17} />
      </Link>
    );
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <Icon name="arrow" size={17} />
    </button>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </div>
  );
}
