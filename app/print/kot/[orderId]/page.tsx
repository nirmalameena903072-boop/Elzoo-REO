import { notFound } from "next/navigation";
import { ensureDb } from "@/lib/db";
import { getOrderWithItems } from "@/lib/db/queries";
import { Paper, PaperRule } from "@/components/print/Paper";
import { clockTime } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

const STATION_ORDER = ["TANDOOR", "CURRY", "CHINESE", "BAR", "DESSERT"];

export default async function PrintKot({ params }: { params: Promise<{ orderId: string }> }) {
  await ensureDb();
  const { orderId } = await params;
  const data = await getOrderWithItems(orderId);
  if (!data) notFound();

  const byStation = STATION_ORDER.map((station) => ({
    station,
    items: data.items.filter((i) => i.station === station && i.state !== "CANCELLED"),
  })).filter((group) => group.items.length > 0);

  return (
    <Paper>
      <div className="text-center">
        <p className="text-[17px] font-semibold tracking-[.1em]">KOT</p>
        <p className="mono mt-0.5 text-[11px]">{data.order.number} · {clockTime(data.order.placedAt)}</p>
      </div>

      <div className="mt-2 flex items-center justify-between border-y border-[#141414] py-1.5">
        <span className="text-[15px] font-semibold">{data.table?.number ?? "—"}</span>
        <span className="text-[10px]">{data.order.note ? "note attached" : "—"}</span>
        <span className="mono text-[10px]">#{data.order.id.slice(-4)}</span>
      </div>

      {byStation.map((group) => (
        <section key={group.station} className="mt-3">
          <p className="text-[9.5px] font-semibold tracking-[.16em] text-[#5b564c]">{group.station}</p>
          <div className="mt-1 space-y-1.5">
            {group.items.map((item) => (
              <div key={item.id}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="min-w-0">{item.nameSnapshot}</span>
                  <span className="mono shrink-0 text-[14px] font-semibold">×{item.qty}</span>
                </div>
                {item.notes && <p className="text-[10.5px] italic">** {item.notes} **</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      {data.order.note && (
        <>
          <PaperRule dashed />
          <p className="text-[10.5px] italic">{data.order.note}</p>
        </>
      )}

      {byStation.length === 0 && <p className="mt-4 text-center text-[11px]">Sab items cancel ho gaye.</p>}

      <PaperRule />
      <div className="flex items-center justify-between text-[9px]">
        <span>VOLUD · KOT</span>
        <span className="mono">{data.items.filter((i) => i.state !== "CANCELLED").length} lines</span>
      </div>
    </Paper>
  );
}
