"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Chip({
  children,
  on,
  onClick,
  className,
  title,
  ariaLabel,
}: {
  children: ReactNode;
  on?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  if (!onClick) {
    return (
      <span className={cn("chip cursor-default", className)} data-on={on ? "true" : undefined} title={title}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cn("chip", className)}
      data-on={on ? "true" : "false"}
      aria-pressed={!!on}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
