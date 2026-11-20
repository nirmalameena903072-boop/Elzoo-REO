"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion, useScroll, useSpring } from "motion/react";

/** Sticky scene: 180vh of scroll height, content pinned. Children receive progress via render prop. */
export function ScrollScene({
  children,
  height = "180vh",
  label,
  disabled,
}: {
  children: (progress: ReturnType<typeof useSpring>) => ReactNode;
  height?: string;
  label?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.35 });

  if (disabled || reduce) {
    return (
      <section aria-label={label} className="relative">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-16 sm:px-8">{children(progress)}</div>
      </section>
    );
  }

  return (
    <section ref={ref} aria-label={label} className="relative" style={{ height }}>
      <div className="sticky top-0 flex h-dvh items-center overflow-hidden">
        <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">{children(progress)}</div>
      </div>
    </section>
  );
}
