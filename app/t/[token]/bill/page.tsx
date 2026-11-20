import { notFound, redirect } from "next/navigation";
import { ensureDb } from "@/lib/db";
import { deviceIdForRequest, resolveSettledOrDiner } from "@/lib/server/session-init";
import { billSummaryForSession, loadBill } from "@/lib/domain/billing";
import { getOutlet } from "@/lib/db/queries";
import { BillScreen, type BillView } from "@/components/diner/BillScreen";

export const dynamic = "force-dynamic";

export default async function BillPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureDb();
  if (!/^T\d{1,2}$/i.test(token)) notFound();

  const deviceId = await deviceIdForRequest();
  const diner = await resolveSettledOrDiner(token.toUpperCase(), deviceId);
  const outlet = await getOutlet();

  const summary = await billSummaryForSession(diner.session.id);
  if (!summary) {
    return <BillScreen bill={null} tableNumber={diner.table.number} />;
  }
  const detail = await loadBill(summary.id);
  if (!detail) return <BillScreen bill={null} tableNumber={diner.table.number} />;

  if (detail.bill.state === "PAID") {
    // paid tables go straight to the review moment, which is the only reason to hold a diner here
    redirect(`/t/${token.toUpperCase()}/review`);
  }

  const settled = detail.payments.filter((p) => p.state === "SUCCESS").reduce((a, p) => a + p.amountPaise, 0);
  const view: BillView = {
    id: detail.bill.id,
    number: detail.bill.number,
    state: detail.bill.state,
    subtotalPaise: detail.bill.subtotalPaise,
    taxPaise: detail.bill.taxPaise,
    servicePaise: detail.bill.servicePaise,
    discountPaise: detail.bill.discountPaise,
    tipPaise: detail.bill.tipPaise,
    totalPaise: detail.bill.totalPaise,
    taxPct: outlet?.taxPct ?? 5,
    servicePct: outlet?.serviceChargePct ?? 0,
    items: detail.items.map((i) => ({ name: i.nameSnapshot, qty: i.qty, pricePaise: i.pricePaise, state: i.state, notes: i.notes })),
    splits: detail.splits.map((s) => ({ id: s.id, label: s.label, amountPaise: s.amountPaise, paid: s.paid })),
    payments: detail.payments.map((p) => ({ id: p.id, method: p.method, state: p.state, amountPaise: p.amountPaise, settledAt: p.settledAt })),
    settledPaise: settled,
    guestCount: detail.guests.length || 2,
    tableNumber: token.toUpperCase(),
    sessionState: detail.session?.state ?? "OPEN",
  };

  return <BillScreen bill={view} tableNumber={token.toUpperCase()} />;
}
