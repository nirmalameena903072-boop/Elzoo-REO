import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Dish photograph. Explicit width/height + sizes so there is no CLS and no oversized download.
 * The three widths are pre-built; we hand the browser a srcset because next/image's
 * optimiser would re-encode webp at request time on a cold serverless function.
 */
export function DishImage({
  path,
  alt,
  width,
  height,
  sizes,
  priority = false,
  className,
}: {
  path: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={`${path}-800.webp`}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
      unoptimized
    />
  );
}

/** Circular dish disc used on the hero and detail sheets. */
export function DishDisc({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-full ring-1 ring-white/12",
        "shadow-[0_40px_120px_-40px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.22)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
