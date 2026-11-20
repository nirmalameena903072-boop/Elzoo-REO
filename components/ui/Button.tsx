import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "ghost" | "quiet" | "danger";

const styles: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  quiet: "btn-quiet",
  danger: "btn-danger",
};

export function Button({
  variant = "ghost",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button type="button" className={cn("btn", styles[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "ghost",
  className,
  children,
  target,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  target?: string;
}) {
  return (
    <Link href={href} className={cn("btn", styles[variant], className)} target={target}>
      {children}
    </Link>
  );
}
