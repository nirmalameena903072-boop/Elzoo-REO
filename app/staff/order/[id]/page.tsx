import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { ensureDb } from "@/lib/db";
import { getOrderWithItems } from "@/lib/db/queries";
import { getStaffSession } from "@/lib/auth/session";
import { clockTime, duration } from "@/lib/utils/time";
import { rupee } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

export default async function StaffOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureDb();
  const staff = await getStaffSession();
  if (!staff) redirect("/staff/login");
  const { id } = await params;
  const found = await getOrderWithItems(id);
  if (!found) redirect("/staff");

  const { order, items } = found;
  const total = items.filter((i) => i.state !== "CANCELLED").reduce((a, i) => a + i.pricePaise * i.qty, 0);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[620px] pb-20">
      <header className="flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-3">
        <Link href="/staff" className="btn btn-quiet h-9 px-2 text-[13px]">
          <ArrowLeft size={15} strokeWidth={1.6} /> Floor
        </Link>
        <span className="mono ml-auto text-[11.5px] text-cream-2">#{order.number}</span>
      </header>

      <main className="px-4 pt-5">
        <p className="micro text-cream-2">{found.table?.number ?? "—"} · order detail</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h1 className="mono text-[30px] leading-none text-cream-0">{rupee(total)}</h1>
          <span
            className={cn(
              "rounded-full border px-2.5 py-[3px] text-[10px] uppercase tracking-[.07em]",
              order.state === "REJECTED" || order.state === "CANCELLED"
                ? "border-[rgba(196,83,43,.45)] text-[#f0b6a0]"
                : "border-[var(--hairline-strong)] text-cream-1",
            )}
          >
            {order.state.toLowerCase().replace(/_/g, " ")}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] text-cream-2">
          placed {clockTime(order.placedAt)}
          {order.acceptedAt ? ` · accepted in ${duration(order.acceptedAt - order.placedAt)}` : " · not yet accepted"}
        </p>

        {order.note && (
          <p className="mt-3 rounded-[10px] border border-[var(--hairline)] px-3 py-2 text-[12px] text-cream-1">{order.note}</p>
        )}
        {order.rejectReason && (
          <p className="mt-3 rounded-[10px] border border-[rgba(196,83,43,.4)] bg-[rgba(196,83,43,.08)] px-3 py-2 text-[12px] text-[#f0b6a0]">
            Rejected: {order.rejectReason.toLowerCase().replace(/_/g, " ")}
            {order.rejectNote ? ` — ${order.rejectNote}` : ""}
          </p>
        )}

        <ul className="mt-4 divide-y divide-[var(--hairline)]/60 rounded-[13px] border border-[var(--hairline)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className={cn("text-[13px]", item.state === "CANCELLED" ? "text-cream-2 line-through" : "text-cream-0")}>
                  <span className="mono mr-1.5 text-cream-2">{item.qty}×</span>
                  {item.nameSnapshot}
                </p>
                <p className="mt-0.5 text-[10.5px] text-cream-2">
                  {item.station.toLowerCase()} · prep {item.prepMinutes}m ·{" "}
                  <span className={item.state === "READY" ? "text-accent" : item.state === "SERVED" ? "text-[#a9e2c9]" : ""}>
                    {item.state.toLowerCase()}
                  </span>
                  {item.notes ? ` · “${item.notes}”` : ""}
                </p>
              </div>
              <span className="mono shrink-0 text-[12px] text-cream-1">{rupee(item.pricePaise * item.qty)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <a href={`/print/kot/${order.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost h-10 flex-1 text-[12.5px]">
            <Printer size={14} strokeWidth={1.6} /> Reprint KOT
          </a>
          {found.table && (
            <Link href={`/staff/bill/session/${order.sessionId}`} className="btn btn-primary h-10 flex-1 text-[12.5px]">
              Bill
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
