import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowUpRight, CircleAlert, IndianRupee, Store, TrendingUp, Users } from "lucide-react";
import { db, ensureDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { OUTLET_ID } from "@/lib/db/constants";
import { VoludWordmark } from "@/components/brand/Marks";
import { rupee } from "@/lib/utils/money";
import { relative } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  await ensureDb();

  const outlets = await db().select().from(t.platformOutlets);
  const alsaReviews = await db()
    .select({ rating: t.reviews.rating, route: t.reviews.route })
    .from(t.reviews)
    .where(eq(t.reviews.outletId, OUTLET_ID));
  const alsaBills = await db()
    .select({ total: t.bills.totalPaise })
    .from(t.bills)
    .where(and(eq(t.bills.outletId, OUTLET_ID), eq(t.bills.state, "PAID")));

  const mrr = outlets.reduce((a, o) => a + o.mrrPaise, 0);
  const paying = outlets.length;
  const atRisk = outlets.filter((o) => o.churnRisk);
  const totalOrders = outlets.reduce((a, o) => a + o.ordersThisMonth, 0);
  const totalTables = outlets.reduce((a, o) => a + o.tablesActive, 0);

  const publicCount = alsaReviews.filter((r) => r.route === "GOOGLE").length;
  const alsaAvg = alsaReviews.length ? alsaReviews.reduce((a, r) => a + r.rating, 0) / alsaReviews.length : 0;
  const alsaRevenue = alsaBills.reduce((a, b) => a + b.total, 0);
  const reviewLift = alsaBills.length ? (alsaReviews.length / alsaBills.length) * 100 : 0;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1200px] px-5 pb-24 pt-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" aria-label="Volud home" className="inline-block">
            <VoludWordmark className="h-[21px] w-auto text-cream-0" />
          </Link>
          <p className="mt-1.5 micro text-cream-2">Platform console · internal</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/demo" className="btn btn-quiet h-9 text-[12px]">Demo</Link>
          <Link href="/admin" className="btn btn-ghost h-9 text-[12px]">
            Alsa tenant <ArrowUpRight size={12} strokeWidth={1.7} />
          </Link>
        </div>
      </header>

      <div className="mt-9 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi icon={IndianRupee} label="MRR" value={rupee(mrr)} note={`${paying} paying outlets`} />
        <Kpi icon={Store} label="Tables live" value={String(totalTables)} note={`across ${paying} rooms`} />
        <Kpi icon={TrendingUp} label="Orders / month" value={totalOrders.toLocaleString("en-IN")} note="all tenants" />
        <Kpi
          icon={CircleAlert}
          label="Churn risk"
          value={String(atRisk.length)}
          note={atRisk.length ? atRisk.map((o) => o.name).join(", ") : "healthy"}
          tone={atRisk.length > 0 ? "warn" : "ok"}
        />
      </div>

      <section className="mt-3 overflow-hidden rounded-[14px] border border-[var(--hairline)]">
        <div className="flex items-baseline justify-between px-4 pt-3.5">
          <h2 className="text-[13px] text-cream-0">Outlets</h2>
          <span className="text-[11px] text-cream-2">last login · plan · volume</span>
        </div>
        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full min-w-[660px] border-collapse text-[12px]">
            <thead>
              <tr className="border-y border-[var(--hairline)]">
                {["Outlet", "City", "Plan", "Tables", "Orders / mo", "Last login", "MRR"].map((h) => (
                  <th key={h} className={cn("px-4 py-2 text-[9.5px] font-normal uppercase tracking-[.08em] text-cream-2", h === "MRR" ? "text-right" : "text-left")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outlets.map((o) => (
                <tr key={o.id} className="border-b border-[var(--hairline)]/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5 text-cream-0">
                      {o.name}
                      {o.isDemoTenant && <span className="rounded-full border border-[rgba(232,164,85,.4)] px-1.5 py-[1px] text-[9px] uppercase tracking-[.05em] text-[#f5dfc2]">demo</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-cream-2">{o.city}</td>
                  <td className="px-4 py-2.5 text-cream-1">{o.plan}</td>
                  <td className="mono px-4 py-2.5 text-cream-1">{o.tablesActive}</td>
                  <td className="mono px-4 py-2.5 text-cream-1">{o.ordersThisMonth.toLocaleString("en-IN")}</td>
                  <td className={cn("px-4 py-2.5", o.churnRisk ? "text-[#f0b6a0]" : "text-cream-2")}>
                    {o.churnRisk && <CircleAlert size={10} strokeWidth={2} className="mr-1 inline" />}
                    {relative(o.lastLoginAt)}
                  </td>
                  <td className="mono px-4 py-2.5 text-right text-cream-0">{rupee(o.mrrPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr]">
        <section className="glass-e1 p-4">
          <h2 className="text-[13px] text-cream-0">The pitch, measured</h2>
          <p className="mt-0.5 text-[11.5px] text-cream-2">Alsa&rsquo;s last two weeks — the numbers a buyer asks for.</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Metric label="Review completion" value={`${Math.round(reviewLift)}%`} note={`${alsaReviews.length} reviews from ${alsaBills.length} bills`} />
            <Metric label="Public-routed" value={`${alsaReviews.length ? Math.round((publicCount / alsaReviews.length) * 100) : 0}%`} note={`${publicCount} went to Google`} />
            <Metric label="Rating" value={alsaAvg ? alsaAvg.toFixed(2) : "—"} note="mean, all routes" />
            <Metric label="Settled GMV" value={rupee(alsaRevenue)} note="seed history + demo" />
          </dl>
          <div className="mt-4 rounded-[10px] border border-[var(--hairline)] px-3 py-2.5">
            <p className="text-[11.5px] leading-relaxed text-cream-1">
              <span className="text-accent">Why the split matters.</span> A 1–3★ guest never leaves a public trail, and the
              kitchen hears about it in the same shift. That is the only retention story a restaurant owner believes.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="glass-e1 p-4">
            <h2 className="text-[13px] text-cream-0">Risk queue</h2>
            {atRisk.length === 0 ? (
              <p className="mt-2 text-[12px] text-cream-2">Koi outlet risk pe nahi.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {atRisk.map((o) => (
                  <li key={o.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12.5px] text-cream-0">{o.name}</p>
                      <p className="text-[10.5px] text-cream-2">{o.city} · {o.plan} · last seen {relative(o.lastLoginAt)}</p>
                    </div>
                    <span className="mono shrink-0 text-[11px] text-[#f0b6a0]">{rupee(o.mrrPaise)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[14px] border border-[var(--hairline)] p-4">
            <div className="flex items-center gap-2">
              <Users size={13} strokeWidth={1.6} className="text-cream-2" />
              <h2 className="text-[12.5px] text-cream-0">Demo access</h2>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-cream-2">
              PIN 4444 opens the owner view. 1111 floor, 2222 manager, 3333 kitchen. No passwords anywhere in this build.
            </p>
          </div>
        </section>
      </div>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-5 text-[11.5px] text-cream-2">
        <span>Volud · sample build · payments simulated</span>
        <div className="flex items-center gap-4">
          <Link href="/api/health" className="underline decoration-[var(--hairline-strong)] underline-offset-4 hover:text-cream-1">Health</Link>
          <Link href="/print/qr" className="underline decoration-[var(--hairline-strong)] underline-offset-4 hover:text-cream-1">Print kit</Link>
        </div>
      </footer>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  note,
  tone = "neutral",
}: {
  icon: typeof Store;
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "warn" | "ok";
}) {
  return (
    <div className="glass-e1 p-3.5">
      <div className="flex items-center justify-between">
        <p className="micro text-cream-2">{label}</p>
        <Icon size={13} strokeWidth={1.5} className={tone === "warn" ? "text-[#f0b6a0]" : "text-cream-2/70"} />
      </div>
      <p className="mono mt-2.5 text-[20px] leading-none text-cream-0">{value}</p>
      <p className="mt-1.5 truncate text-[10.5px] leading-snug text-cream-2">{note}</p>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="micro text-cream-2/85">{label}</dt>
      <dd className="mono mt-1 text-[17px] leading-none text-cream-0">{value}</dd>
      <dd className="mt-1 text-[10.5px] leading-snug text-cream-2">{note}</dd>
    </div>
  );
}
