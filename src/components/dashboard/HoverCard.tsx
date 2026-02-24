"use client";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  /** Tailwind / CSS classes applied to the outer Link */
  className?: string;
  /** Custom hover background using a CSS color-mix expression, defaults to ink 5% */
  hoverColor?: string;
};

/**
 * A Link wrapper that adds a subtle hover background via CSS variables,
 * replacing the dozens of inline onMouseEnter / onMouseLeave handlers.
 */
export default function HoverCard({
  href,
  children,
  className = "",
  hoverColor = "color-mix(in srgb, var(--nb-ink) 5%, transparent)",
}: Props) {
  return (
    <Link
      href={href}
      className={`block rounded-lg transition-colors nb-hover-card ${className}`}
      style={{ "--nb-hover-bg": hoverColor } as React.CSSProperties}
    >
      {children}
    </Link>
  );
}
