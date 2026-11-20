"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { rupee } from "@/lib/utils/money";

type Item = { id: string; name: string; qty: number; revenue: number; marginPct: number; pricePaise: number; station: string };

const QUADRANTS = [
  { key: "STAR", label: "Stars", note: "popular, high margin", x: 1, y: 0 },
  { key: "PLOW", label: "Plowhorses", note: "popular, thin margin", x: 0, y: 0 },
  { key: "PUZZLE", label: "Puzzles", note: "rare, high margin", x: 1, y: 1 },
  { key: "DOG", label: "Dogs", note: "rare, thin margin", x: 0, y: 1 },
] as const;

export function MenuMatrix({ items }: { items: Item[] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const [station, setStation] = useState<string>("ALL");

  const filtered = station === "ALL" ? items : items.filter((i) => i.station === station);
  const { minQty, maxQty, minMargin, maxMargin } = useMemo(() => {
    const qtys = filtered.map((i) => i.qty);
    const margins = filtered.map((i) => i.marginPct);
    return {
      minQty: 0,
      maxQty: Math.max(...qtys, 1),
      minMargin: Math.min(...margins, 50) - 4,
      maxMargin: Math.max(...margins, 80) + 3,
    };
  }, [filtered]);

  const medianQty = useMemo(() => {
    const sorted = [...filtered.map((i) => i.qty)].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
  }, [filtered]);

  const medianMargin = 58;
  const stations = ["ALL", ...Array.from(new Set(items.map((i) => i.station)))];

  const position = (item: Item) => ({
    left: 8 + ((item.qty - minQty) / Math.max(1, maxQty - minQty)) * 84,
    top: 92 - ((item.marginPct - minMargin) / Math.max(1, maxMargin - minMargin)) * 84,
  });

  const quadrantOf = (item: Item) => {
    const popular = item.qty >= medianQty;
    const rich = item.marginPct >= medianMargin;
    return popular ? (rich ? "STAR" : "PLOW") : rich ? "PUZZLE" : "DOG";
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] text-cream-0">Menu engineering</h2>
          <p className="mt-0.5 text-[11.5px] text-cream-2">
            Median {medianQty} plates · {medianMargin}% margin
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {stations.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStation(s)}
              aria-pressed={station === s}
              className={
                station === s
                  ? "rounded-full border border-[rgba(232,164,85,.45)] bg-[rgba(232,164,85,.12)] px-2.5 py-1 text-[10.5px] uppercase tracking-[.05em] text-[#f5dfc2]"
                  : "rounded-full border border-[var(--hairline)] px-2.5 py-1 text-[10.5px] uppercase tracking-[.05em] text-cream-2"
              }
            >
              {s === "ALL" ? "all" : s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] border border-[var(--hairline)] bg-white/[.012] sm:aspect-[16/10]">
        {/* quadrant grid — 2 lines, drawn once */}
        <div className="absolute inset-x-[8%] top-[8%] bottom-[8%]">
          <div className="absolute inset-y-0 left-1/2 w-px bg-[rgba(255,255,255,.09)]" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(255,255,255,.09)]" />
          {QUADRANTS.map((q) => (
            <div
              key={q.key}
              className="absolute px-2.5 py-1.5"
              style={{
                left: q.x === 0 ? 0 : "50%",
                top: q.y === 0 ? 0 : "50%",
                width: "50%",
                paddingTop: q.y === 0 ? 6 : 20,
              }}
            >
              <p className="text-[10px] uppercase tracking-[.07em] text-cream-2/70">{q.label}</p>
              <p className="hidden text-[9.5px] text-cream-2/45 sm:block">{q.note}</p>
            </div>
          ))}

          {filtered.map((item) => {
            const pos = position(item);
            const active = hover === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                onMouseEnter={() => setHover(item.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(item.id)}
                onBlur={() => setHover(null)}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: active ? 1.35 : 1 }}
                transition={{ duration: reduce ? 0.1 : 0.35, delay: reduce ? 0 : Math.random() * 0.1 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                aria-label={`${item.name}: ${item.qty} plates, ${item.marginPct}% margin`}
              >
                <span
                  className="block rounded-full border transition-colors"
                  style={{
                    width: 7 + Math.min(9, item.revenue / 120_000),
                    height: 7 + Math.min(9, item.revenue / 120_000),
                    background: active ? "#E8A455" : "rgba(247,242,232,.62)",
                    borderColor: active ? "rgba(232,164,85,.5)" : "transparent",
                  }}
                />
              </motion.button>
            );
          })}
        </div>

        {hover && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-baseline justify-between gap-2 rounded-[8px] border border-[var(--hairline-strong)] bg-[rgba(12,13,16,.9)] px-2.5 py-1.5 backdrop-blur">
            <span className="truncate text-[11.5px] text-cream-0">{filtered.find((i) => i.id === hover)?.name}</span>
            <span className="mono shrink-0 text-[10.5px] text-cream-2">
              {filtered.find((i) => i.id === hover)?.qty} × · {filtered.find((i) => i.id === hover)?.marginPct}% · {rupee(filtered.find((i) => i.id === hover)?.pricePaise ?? 0)}
            </span>
          </div>
        )}
        {!hover && (
          <span className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-cream-2/60">plates →</span>
        )}
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-[10px] text-cream-2/60">margin ↑</span>
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {filtered
          .filter((i) => quadrantOf(i) === "DOG" || quadrantOf(i) === "PUZZLE")
          .slice(0, 4)
          .map((item) => (
            <li key={item.id} className="text-[10.5px] text-cream-2">
              <span className="text-cream-1">{item.name}</span> · {quadrantOf(item) === "DOG" ? "consider removing" : "push on menu"}
            </li>
          ))}
      </ul>
    </div>
  );
}
