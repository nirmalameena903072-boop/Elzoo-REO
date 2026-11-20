import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Level = 1 | 2 | 3;

type Props = HTMLAttributes<HTMLDivElement> & {
  level?: Level;
  as?: ElementType;
  radius?: "control" | "card" | "sheet";
  interactive?: boolean;
};

/** The one glass recipe. Level picks the elevation — never stack glass on glass on glass. */
export function GlassPanel({
  level = 1,
  as: Tag = "div",
  radius = "card",
  interactive = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <Tag
      className={cn(
        level === 1 && "glass-e1",
        level === 2 && "glass-e2",
        level === 3 && "glass-e3",
        interactive && "glass-hover",
        className,
      )}
      style={{
        borderRadius:
          radius === "control" ? "var(--radius-control)" : radius === "sheet" ? "var(--radius-sheet)" : "var(--radius-card)",
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
