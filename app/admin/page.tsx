import Link from "next/link";
import { ArrowUpRight, ChefHat, MessageSquare, Phone, Star, Users } from "lucide-react";
import { ensureDb } from "@/lib/db";
import { overviewData } from "@/lib/domain/analytics";
import { AdminShell } from "@/components/admin/AdminShell";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { rupee } from "@/lib/utils/money";
import { relative } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await ensureDb();
  const data = await overviewData();
  const thisFortnight = data.series.reduce((a, p) => a + p.revenue, 0);
  const lastFortnight = data.previous.reduce((a, p) => a + p.revenue, 0);
  const delta = lastFortnight > 0 ? Math.round(((thisFortnight - lastFortnight) / lastFortnight) * 100) : null;
  const occupied = data.floor.filter((s) => ["SEATED", "ORDERING", "DINING", "BILL_REQUESTED"].includes(s)).length;

  return (
    <AdminShell
      active="admin"
      title="Overview"
      subtitle={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
      actions={
        <Link href="/staff" className="btn btn-ghost h-9 text-[12.5px]">
          Floor view <ArrowUpRight size={13} strokeWidth={1.6} />
        </Link>
      }
    >
      {/* the two numbers that actually decide his evening */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Kpi
          label="Revenue today"
          value={rupee(data.revenueTodayPaise)}
          note={delta === null ? "no prior data" : `${delta >= 0 ? "+" : ""}${delta}% vs last fortnight`}
          tone={delta !== null && delta < 0 ? "down" : "up"}
        />
        <Kpi label="Covers" value={String(data.coversToday)} note={`${occupied} of 12 tables busy`} />
        <Kpi label="Avg bill" value={data.aovPaise ? rupee(data.aovPaise) : "—"} note="today, all sections" />
        <Kpi
          label="Kitchen load"
          value={`${data.kitchen.open} open`}
          note={data.kitchen.longestMs > 0 ? `oldest ${relative(Date.now() - data.kitchen.longestMs)}` : "line clear"}
          tone={data.kitchen.longestMs > 18 * 60_000 ? "down" : "neutral"}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <section className="glass-e1 p-4 sm:p-5">
          <RevenueChart series={data.series} previous={data.previous} />
        </section>

        <div className="flex flex-col gap-3">
          <section className="glass-e1 p-4">
            <h2 className="micro text-cream-2">Needs you</h2>
            <ul className="mt-3 flex flex-col gap-1">
              <NeedsRow href="/admin/reviews" icon={Star} label="Low-rating reviews" count={data.pendingReviews} />
              <NeedsRow href="/staff" icon={Phone} label="Open waiter calls" count={data.openCalls} />
              <NeedsRow href="/kitchen" icon={ChefHat} label="Tickets past SLA" count={data.kitchen.open > 0 ? 1 : 0} />
              <NeedsRow href="/admin/reviews" icon={MessageSquare} label="Google replies pending" count={0} />
            </ul>
          </section>

          <section className="glass-e1 p-4">
            <h2 className="micro text-cream-2">Top five, by plates</h2>
            <ol className="mt-3 flex flex-col gap-2">
              {data.topItems.map((item, i) => (
                <li key={item.name} className="flex items-baseline gap-2.5 text-[12.5px]">
                  <span className="mono w-3 shrink-0 text-[10px] text-cream-2">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-cream-1">{item.name}</span>
                  <span className="mono shrink-0 text-cream-2">{item.qty}</span>
                  <span className="mono w-[58px] shrink-0 text-right text-cream-0">{rupee(item.revenue)}</span>
                </li>
              ))}
              {data.topItems.length === 0 && <p className="text-[12px] text-cream-2">Abhi data nahi.</p>}
            </ol>
          </section>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/admin/reviews" className="glass-e1 group flex items-start justify-between gap-3 p-4 transition-colors hover:bg-white/[.04]">
          <div>
            <Users size={15} strokeWidth={1.5} className="text-accent" />
            <p className="mt-3 text-[13px] text-cream-0">Review inbox</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-cream-2">Private negatives, replies, and what people keep mentioning.</p>
          </div>
          <ArrowUpRight size={14} className="shrink-0 text-cream-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
        <Link href="/admin/analytics" className="glass-e1 group flex items-start justify-between gap-3 p-4 transition-colors hover:bg-white/[.04]">
          <div>
            <Star size={15} strokeWidth={1.5} className="text-accent" />
            <p className="mt-3 text-[13px] text-cream-0">Menu engineering</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-cream-2">Stars vs plowhorses — where the margin leaks.</p>
          </div>
          <ArrowUpRight size={14} className="shrink-0 text-cream-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
        <Link href="/admin/qr" className="glass-e1 group flex items-start justify-between gap-3 p-4 transition-colors hover:bg-white/[.04]">
          <div>
            <ChefHat size={15} strokeWidth={1.5} className="text-accent" />
            <p className="mt-3 text-[13px] text-cream-0">Table QR</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-cream-2">Print-ready cards for all 12 tables.</p>
          </div>
          <ArrowUpRight size={14} className="shrink-0 text-cream-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "up" | "down" | "neutral" }) {
  return (
    <div className="glass-e1 p-3.5">
      <p className="micro text-cream-2">{label}</p>
      <p className="mono mt-2.5 text-[21px] leading-none text-cream-0">{value}</p>
      <p className={`mt-1.5 text-[11px] leading-snug ${tone === "down" ? "text-[#f0b6a0]" : tone === "up" ? "text-[#a9e2c9]" : "text-cream-2"}`}>{note}</p>
    </div>
  );
}

function NeedsRow({ href, icon: Icon, label, count }: { href: string; icon: typeof Star; label: string; count: number }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-2.5 rounded-[8px] px-1.5 py-2 transition-colors hover:bg-white/[.04]">
        <Icon size={13} strokeWidth={1.5} className={count > 0 ? "text-accent" : "text-cream-2"} />
        <span className="flex-1 text-[12.5px] text-cream-1">{label}</span>
        <span className={`mono text-[12px] ${count > 0 ? "text-cream-0" : "text-cream-2"}`}>{count}</span>
      </Link>
    </li>
  );
}
