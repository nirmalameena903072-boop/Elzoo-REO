import { cn } from "@/lib/utils/cn";
import type { Diet } from "@/lib/db/schema";

export function DietMark({ diet, className }: { diet: Diet; className?: string }) {
  const label = diet === "VEG" ? "Vegetarian" : diet === "EGG" ? "Contains egg" : "Non-vegetarian";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("diet-mark", diet === "VEG" ? "diet-veg" : diet === "EGG" ? "diet-egg" : "diet-nonveg", className)}
    />
  );
}
