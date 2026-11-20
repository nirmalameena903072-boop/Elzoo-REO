import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 py-8", className)}>
      {icon && <div className="text-cream-2">{icon}</div>}
      <p className="text-[15px] text-cream-1">{title}</p>
      {hint && <p className="text-[13px] leading-relaxed text-cream-2 max-w-[42ch]">{hint}</p>}
      {action}
    </div>
  );
}
