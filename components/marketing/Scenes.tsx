"use client";

import Link from "next/link";
import { motion, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, Check, ChefHat, Star, X } from "lucide-react";
import { ScrollScene } from "@/components/motion/ScrollScene";

/* ────────────────────────────────────────────────────────────────────────
   Scene 1 — the handoff. One order travels guest → pass → floor.
   The panels stay put and resolve in sequence, so the eye follows a single
   dal rather than watching three things animate at once.
   ──────────────────────────────────────────────────────────────────────── */
export function SceneService() {
  return (
    <ScrollScene label="How an order travels" height="220vh">
      {(progress) => <ServiceInner progress={progress} />}
    </ScrollScene>
  );
}

function ServiceInner({ progress }: { progress: MotionValue<number> }) {
  // one hook per stage, declared once — never inside a loop
  const stage2 = useTransform(progress, [0.24, 0.4], [0.25, 1]);
  const stage3 = useTransform(progress, [0.52, 0.68], [0.25, 1]);
  const y2 = useTransform(progress, [0.24, 0.4], [18, 0]);
  const y3 = useTransform(progress, [0.52, 0.68], [18, 0]);
  const lineWidth = useTransform(progress, [0.18, 0.72], [0, 1]);
  const elapsed = useTransform(progress, [0, 1], [4, 148]);
  const elapsedLabel = useTransform(elapsed, (v) => `${Math.round(v)}s`);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="micro text-accent">The loop</p>
          <h2 className="mt-2.5 max-w-[22ch] text-[clamp(1.5rem,3.2vw,2.35rem)] leading-[1.06] tracking-[-0.025em]">
            One order, three rooms, four seconds.
          </h2>
        </div>
        <p className="max-w-[30ch] text-[12px] leading-relaxed text-cream-2">
          No printer hums. Nobody walks to the pass to ask. The guest already knows.
        </p>
      </div>

      <div className="mt-9 hidden sm:block" aria-hidden="true">
        <div className="h-px w-full bg-[var(--hairline)]">
          <motion.div className="h-px origin-left bg-accent" style={{ scaleX: lineWidth }} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel
          n="01"
          label="Guest orders"
          detail="Dal Makhani ×1, no onion. Two taps from the QR."
          chip="PLACED"
          tone="neutral"
        />
        <motion.div style={{ opacity: stage2, y: y2 }}>
          <Panel
            n="02"
            label="Pass sees it"
            detail="CURRY · 18 min · table T5. Only the curry station lights up."
            chip="PREPARING"
            tone="accent"
            progressBar
          />
        </motion.div>
        <motion.div style={{ opacity: stage3, y: y3 }}>
          <Panel
            n="03"
            label="Floor serves it"
            detail="Rita, section A, picks it up in 2.4 minutes."
            chip="SERVED"
            tone="mint"
            served
          />
        </motion.div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="micro text-cream-2">elapsed</span>
        <span className="mono text-[14px] tabular-nums text-cream-0">
          <motion.span>{elapsedLabel}</motion.span>
        </span>
        <span className="ml-auto hidden text-[11px] text-cream-2 sm:block">
          on a phone, this is the same screen the guest is already looking at
        </span>
      </div>
    </div>
  );
}

function Panel({
  n,
  label,
  detail,
  chip,
  tone,
  progressBar = false,
  served = false,
}: {
  n: string;
  label: string;
  detail: string;
  chip: string;
  tone: "neutral" | "accent" | "mint";
  progressBar?: boolean;
  served?: boolean;
}) {
  const chipClass =
    tone === "accent"
      ? "border-[rgba(232,164,85,.4)] bg-[rgba(232,164,85,.1)] text-[#f5dfc2]"
      : tone === "mint"
        ? "border-[rgba(127,209,174,.35)] bg-[rgba(127,209,174,.08)] text-[#a9e2c9]"
        : "border-[var(--hairline-strong)] text-cream-2";

  return (
    <div className="h-full rounded-[14px] border border-[var(--hairline)] bg-white/[.02] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="mono text-[10px] text-accent">{n}</span>
        <span className={`rounded-full border px-2 py-[2px] text-[8.5px] uppercase tracking-[.07em] ${chipClass}`}>{chip}</span>
      </div>
      <p className="mt-3 text-[13.5px] text-cream-0">{label}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-cream-2">{detail}</p>

      {progressBar && (
        <div className="mt-3.5 flex items-center gap-2">
          <ChefHat size={12} strokeWidth={1.5} className="shrink-0 text-cream-2" aria-hidden="true" />
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[.06]">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: "10%" }}
              animate={{ width: "62%" }}
              transition={{ duration: 1.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="mono text-[9px] text-cream-2">8m</span>
        </div>
      )}
      {served && (
        <div className="mt-3.5 flex items-center gap-1.5">
          <Check size={11} strokeWidth={2.4} className="text-[#a9e2c9]" aria-hidden="true" />
          <span className="text-[10px] text-cream-2">guest notified on their own phone</span>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Scene 2 — the review split. The product's sharpest idea gets the whole
   viewport: one tap becomes two different outcomes.
   ──────────────────────────────────────────────────────────────────────── */
export function SceneReview() {
  return (
    <ScrollScene label="How the review splits" height="200vh">
      {(progress) => <ReviewInner progress={progress} />}
    </ScrollScene>
  );
}

function ReviewInner({ progress }: { progress: MotionValue<number> }) {
  const spread = useTransform(progress, [0.3, 0.66], [0.18, 1]);
  const leftX = useTransform(progress, [0.3, 0.66], ["0%", "-16%"]);
  const rightX = useTransform(progress, [0.3, 0.66], ["0%", "16%"]);
  const cardOpacity = useTransform(progress, [0.3, 0.46], [1, 0]);
  const cardScale = useTransform(progress, [0.3, 0.46], [1, 0.92]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="micro text-accent">The review</p>
          <h2 className="mt-2.5 max-w-[26ch] text-[clamp(1.5rem,3.2vw,2.35rem)] leading-[1.06] tracking-[-0.025em]">
            Five stars goes somewhere different than two.
          </h2>
        </div>
        <p className="max-w-[32ch] text-[12px] leading-relaxed text-cream-2">
          The same tap. The guest never learns which path they took &mdash; the restaurant does.
        </p>
      </div>

      <div className="relative mt-9 grid grid-cols-1 items-stretch gap-3 sm:mt-12 sm:grid-cols-[1fr_auto_1fr]">
        <motion.div style={{ x: leftX, opacity: spread }} className="order-2 sm:order-1">
          <div className="flex h-full flex-col rounded-[16px] border border-[rgba(127,209,174,.3)] bg-[rgba(127,209,174,.045)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="micro text-[#a9e2c9]">4–5 stars</span>
              <span className="flex gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={10} strokeWidth={1.2} className="fill-[#a9e2c9] text-[#a9e2c9]" />
                ))}
              </span>
            </div>
            <p className="mt-3 flex-1 text-[12.5px] leading-[1.65] text-cream-1">
              Their chips and their own sentence are copied to the clipboard, then Google opens. They
              paste once. The review already sounds like a person.
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--hairline)] pt-2.5">
              <span className="mono text-[10px] text-cream-2">SAVE10</span>
              <span className="text-[10px] text-cream-2">10% next visit</span>
            </div>
          </div>
        </motion.div>

        <motion.div style={{ opacity: cardOpacity, scale: cardScale }} className="order-1 mx-auto w-full max-w-[210px] sm:order-2 sm:self-center">
          <div className="rounded-[16px] border border-[var(--hairline-strong)] bg-white/[.04] p-4 text-center">
            <p className="micro text-cream-2">One tap</p>
            <div className="mt-2.5 flex justify-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={16} strokeWidth={1.2} className="text-accent" />
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-cream-2">Khana kaisa laga?</p>
          </div>
        </motion.div>

        <motion.div style={{ x: rightX, opacity: spread }} className="order-3">
          <div className="flex h-full flex-col rounded-[16px] border border-[rgba(196,83,43,.3)] bg-[rgba(196,83,43,.045)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="micro text-[#f0b6a0]">1–3 stars</span>
              <span className="flex gap-0.5" aria-hidden="true">
                {[1, 2].map((n) => (
                  <Star key={n} size={10} strokeWidth={1.2} className="fill-[#c4532b] text-[#c4532b]" />
                ))}
                {[3, 4, 5].map((n) => (
                  <Star key={n} size={10} strokeWidth={1.2} className="text-cream-2/25" />
                ))}
              </span>
            </div>
            <p className="mt-3 flex-1 text-[12.5px] leading-[1.65] text-cream-1">
              Never public. It lands in the manager&rsquo;s inbox with the table, the server and the
              dish — before the guest has put their phone down.
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--hairline)] pt-2.5">
              <span className="mono text-[10px] text-cream-2">SORRY-DESSERT</span>
              <span className="text-[10px] text-cream-2">manager alert</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-9 flex flex-wrap items-start gap-x-6 gap-y-2 border-t border-[var(--hairline)] pt-5 text-[11.5px] leading-relaxed text-cream-2">
        <span className="flex items-center gap-1.5">
          <Check size={11} strokeWidth={2.4} className="text-[#a9e2c9]" aria-hidden="true" /> Works without a Google place ID
        </span>
        <span className="flex items-center gap-1.5">
          <X size={11} strokeWidth={2.4} className="text-cream-2/50" aria-hidden="true" /> No routing theatre
        </span>
        <Link href="/t/T5/review" className="flex items-center gap-1.5 text-cream-1 underline decoration-[var(--hairline-strong)] underline-offset-4 hover:text-cream-0">
          Try the flow <ArrowRight size={11} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
