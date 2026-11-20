"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { GlassInput } from "@/components/ui/GlassInput";
import { rupee } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

export type MenuRow = {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  station: string;
  diet: string;
  spice: number;
  available: boolean;
  pinned: boolean;
  category: string;
  prepMinutes: number;
};

export function MenuBoard({ items }: { items: MenuRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [station, setStation] = useState("ALL");
  const [busy, setBusy] = useState<string | null>(null);

  const stations = ["ALL", ...Array.from(new Set(items.map((i) => i.station)))];
  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (station === "ALL" || i.station === station) &&
          (query.trim() === "" || i.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [items, station, query],
  );

  const toggle = async (item: MenuRow) => {
    setBusy(item.id);
    await fetch(`/api/menu/${item.id}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available, reason: item.available ? "owner 86" : null }),
    });
    setBusy(null);
    router.refresh();
  };

  const unavailable = items.filter((i) => !i.available).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={13} strokeWidth={1.6} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream-2" />
          <GlassInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the menu" className="pl-8 text-[12.5px]" />
        </div>
        <div className="flex flex-wrap gap-1">
          {stations.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStation(s)}
              aria-pressed={station === s}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10.5px] uppercase tracking-[.05em] transition-colors",
                station === s ? "border-[rgba(232,164,85,.45)] bg-[rgba(232,164,85,.12)] text-[#f5dfc2]" : "border-[var(--hairline)] text-cream-2",
              )}
            >
              {s === "ALL" ? "all" : s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-[11px] text-cream-2">
        {shown.length} items · {unavailable} unavailable right now
      </p>

      <div className="mt-2 overflow-hidden rounded-[13px] border border-[var(--hairline)]">
        <table className="w-full min-w-[560px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-[var(--hairline)]">
              {["Item", "Category", "Station", "Price", "Prep", "Live"].map((h) => (
                <th key={h} className={cn("px-3 py-2 text-[9.5px] font-normal uppercase tracking-[.08em] text-cream-2", h === "Live" || h === "Price" ? "text-right" : "text-left")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => (
              <tr key={item.id} className="border-b border-[var(--hairline)]/50 last:border-0">
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.diet === "VEG" ? "bg-[#3fa76a]" : item.diet === "EGG" ? "bg-accent" : "bg-[#c4532b]")}
                      aria-label={item.diet}
                    />
                    <span className={cn("text-[12.5px]", item.available ? "text-cream-0" : "text-cream-2 line-through")}>{item.name}</span>
                    {item.pinned && <span className="rounded-full border border-[var(--hairline-strong)] px-1.5 text-[8.5px] uppercase tracking-[.05em] text-cream-2">top</span>}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-cream-2">{item.category}</td>
                <td className="px-3 py-2.5 text-cream-2">{item.station.toLowerCase()}</td>
                <td className="mono px-3 py-2.5 text-right text-cream-1">{rupee(item.pricePaise)}</td>
                <td className="mono px-3 py-2.5 text-cream-2">{item.prepMinutes}m</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    disabled={busy === item.id}
                    aria-pressed={item.available}
                    className={cn(
                      "rounded-full border px-2 py-[2px] text-[10px] uppercase tracking-[.05em] transition-colors",
                      item.available
                        ? "border-[rgba(127,209,174,.35)] text-[#a9e2c9] hover:bg-[rgba(127,209,174,.1)]"
                        : "border-[rgba(196,83,43,.45)] text-[#f0b6a0] hover:bg-[rgba(196,83,43,.1)]",
                    )}
                  >
                    {busy === item.id ? "…" : item.available ? "on" : "86"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10.5px] text-cream-2">Availability changes hit the diner menu on the next poll — no cache to bust.</p>
    </div>
  );
}
