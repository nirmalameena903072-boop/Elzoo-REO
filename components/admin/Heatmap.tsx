"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

/** Order density by weekday × hour. Reads as a timetable, not a heat-blob. */
export function Heatmap({ heat }: { heat: number[][] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const peak = Math.max(...heat.flat(), 1);

  // reorder so the service week reads Mon → Sun
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[13px] text-cream-0">When the room fills</h2>
          <p className="mt-0.5 text-[11.5px] text-cream-2">orders per hour, last 14 days</p>
        </div>
        <span className="mono text-[11px] text-cream-2">
          {hover ? `${DAYS[hover.d]} ${HOURS[hover.h]}:00 · ${heat[hover.d]?.[hover.h] ?? 0}` : `peak ${peak}/hr`}
        </span>
      </div>

      <div className="flex gap-1.5">
        <div className="flex flex-col justify-between pb-0.5 pt-[1px]">
          {order.map((d) => (
            <span key={d} className="w-[26px] text-[10px] leading-[18px] text-cream-2">
              {DAYS[d]}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-[3px]">
            {order.map((d) => (
              <div key={d} className="flex gap-[3px]">
                {HOURS.map((h, hi) => {
                  const value = heat[d]?.[hi] ?? 0;
                  const intensity = value / peak;
                  const isPeak = value === peak && peak > 1;
                  return (
                    <div
                      key={h}
                      onMouseEnter={() => setHover({ d, h: hi })}
                      onMouseLeave={() => setHover(null)}
                      className={cn("h-[15px] flex-1 rounded-[2px] transition-colors", isPeak && "ring-1 ring-[rgba(232,164,85,.5)]")}
                      style={{
                        background:
                          intensity === 0
                            ? "rgba(255,255,255,.035)"
                            : `color-mix(in oklab, #E8A455 ${12 + intensity * 78}%, rgba(255,255,255,.04))`,
                      }}
                      aria-label={`${DAYS[d]} ${h}:00, ${value} orders`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-[3px]">
            {HOURS.map((h) => (
              <span key={h} className="flex-1 text-center text-[9px] text-cream-2/70">
                {h % 3 === 0 ? h : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
