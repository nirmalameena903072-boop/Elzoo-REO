import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { getOutlet } from "@/lib/db/queries";
import { loadBill } from "@/lib/domain/billing";
import { DomainError } from "@/lib/domain/errors";
import type { DeskBill } from "@/components/staff/BillDesk";

export async function billDeskPayload(billId: string): Promise<DeskBill> {
  const detail = await loadBill(billId);
  if (!detail) throw new DomainError("NOT_FOUND", "Bill mila nahi.", 404);
  const outlet = await getOutlet();
  const session = detail.session;

  const table = session
    ? (await db().select().from(t.tables).where(eq(t.tables.id, session.tableId)).limit(1))[0]
    : undefined;
  const server = session?.openedByStaffId
    ? (await db().select().from(t.staff).where(eq(t.staff.id, session.openedByStaffId)).limit(1))[0]
    : undefined;

  const settled = detail.payments.filter((p) => p.state === "SUCCESS").reduce((a, p) => a + p.amountPaise, 0);

  return {
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
    items: detail.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      qty: item.qty,
      pricePaise: item.pricePaise,
      state: item.state,
      notes: item.notes,
      station: item.station,
    })),
    splits: detail.splits.map((s) => ({ id: s.id, label: s.label, amountPaise: s.amountPaise, paid: s.paid })),
    payments: detail.payments.map((p) => ({
      id: p.id,
      method: p.method,
      state: p.state,
      amountPaise: p.amountPaise,
      settledAt: p.settledAt,
      createdAt: p.createdAt,
    })),
    settledPaise: settled,
    tableNumber: table?.number ?? "—",
    sessionId: session?.id ?? "",
    openedAt: session?.openedAt ?? detail.bill.createdAt,
    guestCount: detail.guests.length,
    serverName: server?.name ?? null,
  };
}
