import { notFound } from "next/navigation";
import { ensureDb } from "@/lib/db";
import { loadBill } from "@/lib/domain/billing";
import { getOutlet } from "@/lib/db/queries";
import { Paper, PaperRow, PaperRule } from "@/components/print/Paper";

export const dynamic = "force-dynamic";

const when = (ts: number) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(ts);

export default async function PrintBill({ params }: { params: Promise<{ billId: string }> }) {
  await ensureDb();
  const { billId } = await params;
  const data = await loadBill(billId);
  if (!data) notFound();
  const outlet = await getOutlet();
  const settled = data.payments.filter((p) => p.state === "SUCCESS");

  return (
    <Paper>
      <div className="text-center">
        <p className="text-[15px] font-semibold tracking-[.14em]">{outlet?.name.toUpperCase() ?? "ALSA"}</p>
        <p className="mt-0.5 text-[9.5px] leading-snug">{outlet?.address}</p>
        <p className="text-[9.5px]">GSTIN {outlet?.gstin}</p>
        <p className="text-[9.5px]">{outlet?.phone}</p>
      </div>

      <PaperRule />

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
        <span>Bill</span><span className="mono text-right">{data.bill.number}</span>
        <span>Table</span><span className="mono text-right">{data.table?.number ?? "—"}</span>
        <span>{data.bill.state === "PAID" ? "Paid" : "Issued"}</span>
        <span className="mono text-right">{when(data.bill.paidAt ?? data.bill.createdAt)}</span>
        <span>Covers</span><span className="mono text-right">{data.guests.length}</span>
      </div>

      <PaperRule dashed />

      <div className="space-y-1">
        {data.items.filter((i) => i.state !== "CANCELLED").map((item) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="min-w-0">{item.nameSnapshot}</span>
              <span className="mono shrink-0 tabular-nums">{(item.pricePaise * item.qty / 100).toFixed(2)}</span>
            </div>
            <div className="text-[9.5px] text-[#5b564c]">
              {item.qty} × {(item.pricePaise / 100).toFixed(2)}
              {item.notes ? ` · ${item.notes}` : ""}
            </div>
          </div>
        ))}
      </div>

      <PaperRule dashed />

      <div className="space-y-0.5">
        <PaperRow left="Subtotal" right={(data.bill.subtotalPaise / 100).toFixed(2)} size="sm" />
        {data.bill.discountPaise > 0 && <PaperRow left="Discount" right={`-${(data.bill.discountPaise / 100).toFixed(2)}`} size="sm" />}
        <PaperRow left={`CGST @ ${((outlet?.taxPct ?? 5) / 2).toFixed(1)}%`} right={(data.bill.taxPaise / 200).toFixed(2)} size="sm" />
        <PaperRow left={`SGST @ ${((outlet?.taxPct ?? 5) / 2).toFixed(1)}%`} right={(data.bill.taxPaise / 200).toFixed(2)} size="sm" />
        {data.bill.servicePaise > 0 && <PaperRow left={`Service ${outlet?.serviceChargePct ?? 0}%`} right={(data.bill.servicePaise / 100).toFixed(2)} size="sm" />}
        {data.bill.tipPaise > 0 && <PaperRow left="Tip" right={(data.bill.tipPaise / 100).toFixed(2)} size="sm" />}
      </div>

      <PaperRule />

      <PaperRow left="TOTAL" right={`₹ ${(data.bill.totalPaise / 100).toFixed(2)}`} bold size="lg" />

      {settled.length > 0 && (
        <>
          <PaperRule dashed />
          <div className="space-y-0.5">
            {settled.map((p) => (
              <PaperRow key={p.id} left={`${p.method} · ${p.id.slice(-4)}`} right={(p.amountPaise / 100).toFixed(2)} size="sm" />
            ))}
          </div>
        </>
      )}

      <PaperRule dashed />

      <p className="text-center text-[9px] leading-relaxed">
        Amounts in INR. Taxes as applicable.<br />
        Thank you — phir aayein.
      </p>
      <p className="mt-2 text-center text-[8px] tracking-[.12em] text-[#5b564c]">VOLUD · SAMPLE BUILD</p>
    </Paper>
  );
}
