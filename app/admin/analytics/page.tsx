import { ensureDb } from "@/lib/db";
import { analyticsData } from "@/lib/domain/analytics";
import { AdminShell } from "@/components/admin/AdminShell";
import { MenuMatrix } from "@/components/admin/MenuMatrix";
import { Heatmap } from "@/components/admin/Heatmap";
import { rupee } from "@/lib/utils/money";
import { duration } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await ensureDb();
  const data = await analyticsData();

  return (
    <AdminShell active="analytics" title="Analytics" subtitle="Fourteen days, everything that left the pass.">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
        <section className="glass-e1 p-4">
          <MenuMatrix items={data.matrix} />
        </section>
        <section className="glass-e1 p-4">
          <Heatmap heat={data.heat} />
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--hairline)] pt-3.5">
            <Stat label="Avg dine" value={data.avgDineMs ? duration(data.avgDineMs) : "—"} note="open to paid" />
            <Stat
              label="Busiest table"
              value={data.turns.busiestTable ? data.turns.busiestTable.replace("tbl_", "").toUpperCase() : "—"}
              note={`${data.turns.turns} turns`}
            />
          </div>
        </section>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
        <section className="glass-e1 overflow-hidden">
          <div className="flex items-baseline justify-between px-4 pt-4">
            <h2 className="text-[13px] text-cream-0">Floor staff</h2>
            <span className="text-[11px] text-cream-2">accepted orders, response, stars</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[12px]">
              <thead>
                <tr className="border-y border-[var(--hairline)]">
                  {["Name", "Section", "Orders", "Avg response", "5★", "Tips"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-normal uppercase tracking-[.07em] text-cream-2 last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.staffPerf.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--hairline)]/60 last:border-0">
                    <td className="px-4 py-2.5 text-cream-0">{row.name}</td>
                    <td className="px-4 py-2.5 text-cream-2">{row.section ?? "—"}</td>
                    <td className="mono px-4 py-2.5 text-cream-1">{row.orders}</td>
                    <td className={row.avgResponseMs > 120_000 ? "mono px-4 py-2.5 text-[#f0b6a0]" : "mono px-4 py-2.5 text-cream-1"}>
                      {row.avgResponseMs ? duration(row.avgResponseMs) : "—"}
                    </td>
                    <td className="mono px-4 py-2.5 text-cream-1">{row.fiveStars || "—"}</td>
                    <td className="mono px-4 py-2.5 text-right text-cream-0">{rupee(row.tipsPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <section className="glass-e1 p-4">
            <h2 className="text-[13px] text-cream-0">Rejections &amp; cancellations</h2>
            <p className="mt-0.5 text-[11.5px] text-cream-2">Why plates don&rsquo;t happen</p>
            <ul className="mt-3 flex flex-col gap-2">
              {data.rejections.map((r) => (
                <Bar key={r.reason} label={r.reason.toLowerCase().replace(/_/g, " ")} value={r.n} total={Math.max(1, ...data.rejections.map((x) => x.n))} />
              ))}
              {data.cancellations.map((c) => (
                <Bar key={c.reason} label={c.reason.toLowerCase()} value={c.n} total={Math.max(1, ...data.cancellations.map((x) => x.n))} muted />
              ))}
              {data.rejections.length === 0 && data.cancellations.length === 0 && (
                <li className="text-[12px] text-cream-2">Kuch reject nahi hua. Achha hai.</li>
              )}
            </ul>
          </section>

          <section className="glass-e1 p-4">
            <h2 className="text-[13px] text-cream-0">Review loop</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Avg" value={data.reviewStats.avg ? data.reviewStats.avg.toFixed(2) : "—"} note="out of 5" />
              <Stat label="Reviews" value={String(data.reviewStats.count)} note="all routes" />
              <Stat label="Completion" value={`${data.reviewStats.completionRate}%`} note="bills → reviews" />
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="micro text-cream-2/85">{label}</p>
      <p className="mono mt-1 text-[15px] text-cream-0">{value}</p>
      <p className="text-[10.5px] text-cream-2">{note}</p>
    </div>
  );
}

function Bar({ label, value, total, muted = false }: { label: string; value: number; total: number; muted?: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="w-[104px] shrink-0 truncate text-[11.5px] text-cream-1">{label}</span>
      <span className="h-[3px] flex-1 rounded-full bg-white/[.05]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(6, (value / total) * 100)}%`, background: muted ? "rgba(232,164,85,.4)" : "rgba(196,83,43,.75)" }}
        />
      </span>
      <span className="mono w-4 shrink-0 text-right text-[11px] text-cream-2">{value}</span>
    </li>
  );
}
