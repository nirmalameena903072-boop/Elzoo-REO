"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupee } from "@/lib/utils/money";
import { dayMonth } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

type Point = { ts: number; revenue: number; orders: number };

/** 14 days of revenue. One baseline, no gridlines, no legend noise. */
export function RevenueChart({ series, previous }: { series: Point[]; previous: Point[] }) {
  const [compare, setCompare] = useState(false);
  const data = useMemo(
    () =>
      series.map((point, i) => ({
        day: dayMonth(point.ts),
        revenue: Math.round(point.revenue / 100),
        orders: point.orders,
        previous: Math.round((previous[i]?.revenue ?? 0) / 100),
      })),
    [series, previous],
  );

  const peak = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="micro text-cream-2">Revenue · last 14 days</p>
          <p className="mono mt-1 text-[13px] text-cream-1">
            peak <span className="text-cream-0">{rupee(peak * 100)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCompare((c) => !c)}
          aria-pressed={compare}
          className={cn(
            "flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
            compare ? "border-[rgba(232,164,85,.45)] text-[#f5dfc2]" : "border-[var(--hairline)] text-cream-2",
          )}
        >
          <span className={cn("h-[2px] w-4 rounded-full", compare ? "bg-accent" : "bg-cream-2/60")} aria-hidden="true" />
          vs previous 14 days
        </button>
      </div>

      <div className="h-[212px] w-full" aria-label="Revenue trend chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8A455" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#E8A455" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal vertical={false} stroke="rgba(255,255,255,.06)" strokeDasharray="0" />
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(247,242,232,.42)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={2}
              dy={4}
            />
            <YAxis
              tick={{ fill: "rgba(247,242,232,.42)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={54}
              tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`}
            />
            <Tooltip
              cursor={{ stroke: "rgba(232,164,85,.35)", strokeWidth: 1 }}
              contentStyle={{
                background: "rgba(16,18,22,.94)",
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: 10,
                fontSize: 12,
                color: "#F7F2E8",
                padding: "8px 11px",
                backdropFilter: "blur(12px)",
              }}
              labelStyle={{ color: "rgba(247,242,232,.6)", fontSize: 11, marginBottom: 2 }}
              formatter={(value: number, name: string) => [rupee(value * 100), name === "revenue" ? "this period" : "previous"]}
            />
            {compare && (
              <Line type="monotone" dataKey="previous" stroke="rgba(247,242,232,.28)" strokeWidth={1.2} strokeDasharray="3 4" dot={false} />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#E8A455"
              strokeWidth={1.6}
              fill="url(#revFill)"
              dot={false}
              activeDot={{ r: 3, fill: "#E8A455", stroke: "#0A0B0D", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
