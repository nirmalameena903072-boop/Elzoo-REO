"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils/cn";

/**
 * A phone drawn in CSS, not a screenshot. The screen content is real markup so it
 * stays crisp at any zoom and can react to scroll progress.
 */
export function PhoneFrame({
  children,
  className,
  progress,
  depth = 0,
}: {
  children: React.ReactNode;
  className?: string;
  progress?: MotionValue<number>;
  depth?: number;
}) {
  // hooks are unconditional here; `progress` being absent just means a flat value
  const zero = useTransform([], () => 0);
  const source = progress ?? zero;
  const y = useTransform(source, [0, 1], [0, depth * -90]);
  const scale = useTransform(source, [0, 1], [1, 1 - depth * 0.09]);
  const rotate = depth === 0 ? 0 : depth === 1 ? -5 : 4;

  return (
    <motion.div style={{ y, scale, rotateZ: rotate }} className={cn("relative", className)} aria-hidden={depth > 0 ? "true" : undefined}>
      <div className="rounded-[30px] border border-[rgba(255,255,255,.14)] bg-[#0d0f12] p-[6px] shadow-[0_40px_80px_-32px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.16)]">
        <div className="relative overflow-hidden rounded-[25px] bg-[#0a0b0d]">
          <div className="absolute left-1/2 top-[7px] z-20 h-[18px] w-[62px] -translate-x-1/2 rounded-full bg-[#07080a]" />
          <div className="h-[440px] w-[214px] overflow-hidden pt-[26px]">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}

export function PhoneChrome() {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-0.5">
      <span className="mono text-[7px] text-cream-2">9:41</span>
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        <span className="h-[5px] w-[5px] rounded-full bg-cream-2/70" />
        <span className="h-[5px] w-[8px] rounded-[1px] bg-cream-2/70" />
        <span className="h-[5px] w-[12px] rounded-[1px] border border-cream-2/50" />
      </span>
    </div>
  );
}
