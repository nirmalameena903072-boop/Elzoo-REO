"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, MessageSquare, Star } from "lucide-react";
import { GlassTextarea } from "@/components/ui/GlassInput";
import { relative } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

export type ReviewRow = {
  id: string;
  rating: number;
  route: string;
  chips: string[];
  freeText: string | null;
  composed: string;
  couponCode: string | null;
  createdAt: number;
  resolvedAt: number | null;
  reply: string | null;
  tableNumber: string;
  guestName: string | null;
  serverName: string | null;
  googleClicked: boolean;
  suggestions: string[];
};

type Filter = "PRIVATE" | "GOOGLE" | "ALL";

export function ReviewInbox({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("PRIVATE");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const shown = useMemo(
    () => (filter === "ALL" ? reviews : reviews.filter((r) => r.route === filter)),
    [reviews, filter],
  );
  const unresolved = reviews.filter((r) => !r.resolvedAt && r.rating <= 3).length;
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  const chipTally = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const review of reviews) {
      for (const chip of review.chips) {
        const entry = map.get(chip) ?? { count: 0, total: 0 };
        entry.count += 1;
        entry.total += review.rating;
        map.set(chip, entry);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);
  }, [reviews]);

  const act = async (review: ReviewRow, kind: "reply" | "resolve") => {
    setBusy(review.id + kind);
    const url = kind === "reply" ? `/api/reviews/${review.id}/reply` : `/api/reviews/${review.id}/resolve`;
    const body = kind === "reply" ? { reply: drafts[review.id] ?? review.reply ?? "" } : {};
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { ok: boolean; message?: string };
    setBusy(null);
    if (json.ok) router.refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_290px]">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {(["PRIVATE", "GOOGLE", "ALL"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11.5px] transition-colors",
                filter === f
                  ? "border-[rgba(232,164,85,.45)] bg-[rgba(232,164,85,.12)] text-[#f5dfc2]"
                  : "border-[var(--hairline)] text-cream-2 hover:text-cream-1",
              )}
            >
              {f === "PRIVATE" ? "Private" : f === "GOOGLE" ? "Public route" : "All"}
              <span className="mono ml-1.5 text-cream-2">
                {f === "ALL" ? reviews.length : reviews.filter((r) => r.route === f).length}
              </span>
            </button>
          ))}
          {unresolved > 0 && <span className="ml-auto text-[11.5px] text-[#f0b6a0]">{unresolved} unresolved</span>}
        </div>

        <ul className="flex flex-col gap-2">
          {shown.map((review) => {
            const open = openId === review.id;
            const draft = drafts[review.id] ?? review.reply ?? "";
            return (
              <motion.li
                key={review.id}
                layout={!reduce}
                className={cn(
                  "rounded-[13px] border bg-white/[.018] transition-colors",
                  review.resolvedAt ? "border-[var(--hairline)] opacity-65" : review.rating <= 2 ? "border-[rgba(196,83,43,.35)]" : "border-[var(--hairline)]",
                )}
              >
                <button type="button" onClick={() => setOpenId(open ? null : review.id)} className="w-full px-3.5 py-3 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5" aria-label={`${review.rating} stars`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={11}
                            strokeWidth={1.4}
                            className={n <= review.rating ? "fill-accent text-accent" : "text-cream-2/35"}
                          />
                        ))}
                      </span>
                      <span className="mono text-[10.5px] text-cream-2">{review.tableNumber}</span>
                      <span className="text-[10.5px] text-cream-2">· {relative(review.createdAt)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {review.route === "GOOGLE" ? (
                        <span className="rounded-full border border-[rgba(127,209,174,.3)] px-1.5 py-[1px] text-[9.5px] uppercase tracking-[.06em] text-[#a9e2c9]">public</span>
                      ) : (
                        <span className="rounded-full border border-[var(--hairline-strong)] px-1.5 py-[1px] text-[9.5px] uppercase tracking-[.06em] text-cream-2">private</span>
                      )}
                      {review.resolvedAt && <Check size={12} strokeWidth={2} className="text-[#a9e2c9]" />}
                    </div>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-cream-1">
                    {review.composed || "(no text — stars only)"}
                  </p>
                  <p className="mt-1 text-[10.5px] text-cream-2">
                    {review.guestName ?? "Guest"} {review.serverName ? `· served by ${review.serverName}` : ""}
                    {review.couponCode ? ` · ${review.couponCode}` : ""}
                  </p>
                </button>

                {open && (
                  <div className="border-t border-[var(--hairline)] px-3.5 py-3">
                    {review.chips.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1">
                        {review.chips.map((chip) => (
                          <span key={chip} className="rounded-full bg-white/[.05] px-2 py-[2px] text-[10.5px] text-cream-1">{chip}</span>
                        ))}
                      </div>
                    )}
                    {review.freeText && <p className="mb-2.5 text-[12px] italic leading-relaxed text-cream-2">“{review.freeText}”</p>}

                    {review.reply ? (
                      <div className="mb-2 rounded-[9px] border border-[var(--hairline)] bg-white/[.02] p-2.5">
                        <p className="micro text-cream-2">Your reply</p>
                        <p className="mt-1 text-[12px] leading-relaxed text-cream-1">{review.reply}</p>
                      </div>
                    ) : (
                      <>
                        <label htmlFor={`reply-${review.id}`} className="micro mb-1.5 block text-cream-2">Reply</label>
                        <GlassTextarea
                          id={`reply-${review.id}`}
                          rows={2}
                          value={draft}
                          onChange={(e) => setDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
                          placeholder="Seedha, chhota, insaani."
                          className="text-[12.5px]"
                        />
                        {review.suggestions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {review.suggestions.slice(0, 3).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setDrafts((d) => ({ ...d, [review.id]: s }))}
                                className="flex items-center gap-1 rounded-full border border-[var(--hairline)] px-2 py-[3px] text-left text-[10.5px] text-cream-2 hover:text-cream-1"
                              >
                                <Copy size={9} strokeWidth={1.6} /> {s.length > 42 ? `${s.slice(0, 42)}…` : s}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    <div className="mt-2.5 flex items-center gap-1.5">
                      {!review.reply && (
                        <button
                          type="button"
                          onClick={() => act(review, "reply")}
                          disabled={busy === review.id + "reply" || draft.trim().length < 2}
                          className="btn btn-ghost h-8 px-2.5 text-[11.5px]"
                        >
                          <MessageSquare size={11} strokeWidth={1.6} /> Save reply
                        </button>
                      )}
                      {!review.resolvedAt && (
                        <button
                          type="button"
                          onClick={() => act(review, "resolve")}
                          disabled={busy === review.id + "resolve"}
                          className="btn btn-quiet h-8 px-2.5 text-[11.5px]"
                        >
                          <Check size={11} strokeWidth={1.8} /> Mark closed
                        </button>
                      )}
                      <span className="ml-auto text-[10px] text-cream-2">{review.googleClicked ? "went to Google" : ""}</span>
                    </div>
                  </div>
                )}
              </motion.li>
            );
          })}
          {shown.length === 0 && <li className="rounded-[13px] border border-[var(--hairline)] px-4 py-8 text-center text-[12.5px] text-cream-2">Is filter mein kuch nahi.</li>}
        </ul>
      </div>

      <aside className="flex flex-col gap-3">
        <section className="glass-e1 p-4">
          <p className="micro text-cream-2">All-time</p>
          <p className="mono mt-2 text-[26px] leading-none text-cream-0">{avg ? avg.toFixed(2) : "—"}</p>
          <p className="mt-1 text-[11px] text-cream-2">{reviews.length} reviews · {reviews.filter((r) => r.route === "GOOGLE").length} public</p>
        </section>

        <section className="glass-e1 p-4">
          <p className="micro text-cream-2">What people mention</p>
          <ul className="mt-3 flex flex-col gap-2">
            {chipTally.map(([chip, data]) => {
              const chipAvg = data.total / data.count;
              return (
                <li key={chip} className="flex items-baseline gap-2">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", chipAvg >= 4 ? "bg-[#7FD1AE]" : "bg-[#C4532B]")} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-cream-1">{chip}</span>
                  <span className="mono shrink-0 text-[10.5px] text-cream-2">{data.count}</span>
                </li>
              );
            })}
            {chipTally.length === 0 && <li className="text-[11.5px] text-cream-2">Abhi tags nahi.</li>}
          </ul>
        </section>

        <section className="rounded-[13px] border border-[var(--hairline)] p-3.5">
          <p className="text-[11px] leading-relaxed text-cream-2">
            <span className="text-cream-1">Routing rule.</span> 4–5★ gets pushed to Google with the guest&rsquo;s own words copied. 1–3★ never leaves this inbox.
          </p>
        </section>
      </aside>
    </div>
  );
}
