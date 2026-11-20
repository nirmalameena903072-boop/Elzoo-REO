import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { DomainError } from "./errors";
import { newId } from "@/lib/utils/ids";
import { splitEqually } from "@/lib/utils/money";
import { nextBillNumber } from "@/lib/db/queries";

export type BillMath = {
  subtotalPaise: number;
  taxPaise: number;
  servicePaise: number;
  discountPaise: number;
  tipPaise: number;
  totalPaise: number;
};

/** Money math lives here and only here: integer paise, half-up rounding, tax on (subtotal − discount). */
export function computeBill(subtotalPaise: number, opts: {
  taxPct: number;
  servicePct: number;
  discountPaise?: number;
  tipPaise?: number;
}): BillMath {
  const discount = Math.min(opts.discountPaise ?? 0, subtotalPaise);
  const taxable = subtotalPaise - discount;
  const service = Math.round((taxable * opts.servicePct) / 100);
  const tax = Math.round((taxable * opts.taxPct) / 100);
  const tip = Math.max(0, opts.tipPaise ?? 0);
  return {
    subtotalPaise,
    taxPaise: tax,
    servicePaise: service,
    discountPaise: discount,
    tipPaise: tip,
    totalPaise: taxable + service + tax + tip,
  };
}

/** Generate (or return the live) bill for a session from its non-cancelled items. */
export async function generateBillForSession(sessionId: string, staffId: string | null) {
  const existing = await db()
    .select()
    .from(t.bills)
    .where(and(eq(t.bills.sessionId, sessionId), inArray(t.bills.state, ["DRAFT", "REQUESTED", "PARTIALLY_PAID"])))
    .limit(1);
  if (existing[0]) {
    const detail = await loadBill(existing[0].id);
    return { bill: existing[0], reused: true, detail };
  }

  const sessionRows = await db().select().from(t.sessions).where(eq(t.sessions.id, sessionId)).limit(1);
  const session = sessionRows[0];
  if (!session) throw new DomainError("NOT_FOUND", "Session mila nahi.", 404);

  const outlet = (await db().select().from(t.outlets).where(eq(t.outlets.id, session.outletId)).limit(1))[0];
  if (!outlet) throw new DomainError("NOT_FOUND", "Outlet mila nahi.", 404);

  const orders = await db().select().from(t.orders).where(eq(t.orders.sessionId, sessionId));
  if (orders.length === 0) throw new DomainError("VALIDATION", "Is table pe koi order nahi hai — bill kya banega.", 400);
  const items = await db()
    .select()
    .from(t.orderItems)
    .where(inArray(t.orderItems.orderId, orders.map((o) => o.id)));
  const subtotal = items
    .filter((i) => i.state !== "CANCELLED")
    .reduce((acc, i) => acc + i.pricePaise * i.qty, 0);
  if (subtotal === 0) throw new DomainError("VALIDATION", "Saare items cancel ho gaye — bill zero ka nahi banta.", 400);

  const math = computeBill(subtotal, { taxPct: outlet.taxPct, servicePct: outlet.serviceChargePct });
  const id = newId("bil");
  const number = await nextBillNumber();
  const now = Date.now();
  await db().insert(t.bills).values({
    id, outletId: session.outletId, sessionId, number, state: "REQUESTED",
    subtotalPaise: math.subtotalPaise, taxPaise: math.taxPaise, servicePaise: math.servicePaise,
    discountPaise: 0, tipPaise: 0, totalPaise: math.totalPaise, splitMode: null,
    createdByStaffId: staffId, createdAt: now,
  });
  await db().update(t.sessions).set({ state: "BILLED" }).where(eq(t.sessions.id, sessionId));
  await db().update(t.orders).set({ state: "BILLED" }).where(and(eq(t.orders.sessionId, sessionId), inArray(t.orders.state, ["SERVED", "READY", "PREPARING", "IN_KITCHEN", "ACCEPTED"])));
  await db().update(t.tables).set({ state: "BILL_REQUESTED", stateSince: now }).where(eq(t.tables.id, session.tableId));

  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, id)).limit(1))[0]!;
  return { bill, reused: false, detail: await loadBill(id) };
}

export async function loadBill(billId: string) {
  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, billId)).limit(1))[0];
  if (!bill) return null;
  const [splits, payments] = await Promise.all([
    db().select().from(t.billSplits).where(eq(t.billSplits.billId, billId)),
    db().select().from(t.payments).where(eq(t.payments.billId, billId)),
  ]);
  const session = (await db().select().from(t.sessions).where(eq(t.sessions.id, bill.sessionId)).limit(1))[0] ?? null;
  const orders = session ? await db().select().from(t.orders).where(eq(t.orders.sessionId, session.id)) : [];
  const items = orders.length
    ? await db().select().from(t.orderItems).where(inArray(t.orderItems.orderId, orders.map((o) => o.id)))
    : [];
  const table = session ? (await db().select().from(t.tables).where(eq(t.tables.id, session.tableId)).limit(1))[0] ?? null : null;
  const guests = session ? await db().select().from(t.guests).where(eq(t.guests.sessionId, session.id)) : [];
  return { bill, splits, payments, session, orders, items, table, guests };
}

export async function applyDiscount(billId: string, args: { amountPaise: number; reason: string; staffId: string }) {
  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, billId)).limit(1))[0];
  if (!bill) throw new DomainError("NOT_FOUND", "Bill mila nahi.", 404);
  if (bill.state === "PAID" || bill.state === "VOID") throw new DomainError("CONFLICT", "Paid bill pe discount nahi lagta.");
  const outlet = (await db().select().from(t.outlets).where(eq(t.outlets.id, bill.outletId)).limit(1))[0]!;
  const math = computeBill(bill.subtotalPaise, {
    taxPct: outlet.taxPct, servicePct: outlet.serviceChargePct,
    discountPaise: args.amountPaise, tipPaise: bill.tipPaise,
  });
  await db()
    .update(t.bills)
    .set({
      discountPaise: math.discountPaise, taxPaise: math.taxPaise, servicePaise: math.servicePaise,
      totalPaise: math.totalPaise, discountReason: args.reason.slice(0, 80),
    })
    .where(eq(t.bills.id, billId));
  await db().insert(t.auditLog).values({
    id: newId("aud"), outletId: bill.outletId, staffId: args.staffId, action: "discount.applied",
    entity: "bill", entityId: billId, meta: JSON.stringify({ amountPaise: math.discountPaise, reason: args.reason }), createdAt: Date.now(),
  });
  return { totalPaise: math.totalPaise, discountPaise: math.discountPaise };
}

export async function setTip(billId: string, tipPaise: number) {
  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, billId)).limit(1))[0];
  if (!bill) throw new DomainError("NOT_FOUND", "Bill mila nahi.", 404);
  if (bill.state === "PAID") throw new DomainError("CONFLICT", "Paid bill pe tip nahi badalta.");
  const outlet = (await db().select().from(t.outlets).where(eq(t.outlets.id, bill.outletId)).limit(1))[0]!;
  const math = computeBill(bill.subtotalPaise, {
    taxPct: outlet.taxPct, servicePct: outlet.serviceChargePct,
    discountPaise: bill.discountPaise, tipPaise,
  });
  await db().update(t.bills).set({ tipPaise: math.tipPaise, totalPaise: math.totalPaise }).where(eq(t.bills.id, billId));
  return { totalPaise: math.totalPaise };
}

/**
 * Split modes. Every path must sum to totalPaise exactly — the remainder lands on the first splits.
 */
export async function createSplits(billId: string, mode: "EQUAL" | "BY_ITEM" | "CUSTOM", payload: {
  ways?: number;
  items?: string[];
  custom?: number[];
}) {
  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, billId)).limit(1))[0];
  if (!bill) throw new DomainError("NOT_FOUND", "Bill mila nahi.", 404);
  if (bill.state === "PAID") throw new DomainError("CONFLICT", "Bill already paid hai.");
  const paid = (await db().select().from(t.payments).where(and(eq(t.payments.billId, billId), eq(t.payments.state, "SUCCESS"))));
  if (paid.length > 0) throw new DomainError("CONFLICT", "Kuch payment ho chuki hai — split abhi nahi badal sakta.");

  await db().delete(t.billSplits).where(eq(t.billSplits.billId, billId));

  let amounts: number[] = [];
  let labels: string[] = [];

  if (mode === "EQUAL") {
    const ways = Math.min(8, Math.max(2, payload.ways ?? 2));
    amounts = splitEqually(bill.totalPaise, ways);
    labels = amounts.map((_, i) => `Guest ${i + 1}`);
  } else if (mode === "CUSTOM") {
    const custom = payload.custom ?? [];
    if (custom.length < 2) throw new DomainError("VALIDATION", "Kam se kam do amounts chahiye.", 400);
    const total = custom.reduce((a, b) => a + b, 0);
    if (total !== bill.totalPaise) {
      const diff = bill.totalPaise - total;
      throw new DomainError(
        "VALIDATION",
        diff > 0
          ? `₹${(diff / 100).toFixed(0)} kam hai — amounts total se match nahi kar rahe.`
          : `₹${(-diff / 100).toFixed(0)} zyada hai — amounts total se match nahi kar rahe.`,
        400,
      );
    }
    amounts = custom;
    labels = custom.map((_, i) => `Guest ${i + 1}`);
  } else {
    // BY_ITEM: the selected item ids make one share; the rest make the other.
    const selected = payload.items ?? [];
    if (selected.length === 0) throw new DomainError("VALIDATION", "Kam se kam ek item chunein.", 400);
    const session = (await db().select().from(t.sessions).where(eq(t.sessions.id, bill.sessionId)).limit(1))[0]!;
    const orders = await db().select().from(t.orders).where(eq(t.orders.sessionId, session.id));
    const items = await db().select().from(t.orderItems).where(inArray(t.orderItems.orderId, orders.map((o) => o.id)));
    const share = items.filter((i) => selected.includes(i.id) && i.state !== "CANCELLED").reduce((a, i) => a + i.pricePaise * i.qty, 0);
    if (share === 0) throw new DomainError("VALIDATION", "Chune hue items ka total zero hai.", 400);
    const ratio = share / bill.subtotalPaise;
    const first = Math.round(bill.totalPaise * ratio);
    amounts = [first, bill.totalPaise - first];
    labels = ["Picked items", "Everything else"];
  }

  const rows = amounts.map((amount, i) => ({
    id: newId("spl"), billId, guestId: null, label: labels[i] ?? `Guest ${i + 1}`,
    amountPaise: amount, paid: false, paymentId: null,
  }));
  await db().insert(t.billSplits).values(rows);
  await db().update(t.bills).set({ splitMode: mode }).where(eq(t.bills.id, billId));
  return { splits: rows, sum: rows.reduce((a, r) => a + r.amountPaise, 0) };
}

/** Bill becomes PAID only when SUCCESS payments equal totalPaise exactly. */
export async function settleBillIfCovered(billId: string) {
  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, billId)).limit(1))[0];
  if (!bill) return { paid: false as const };
  const payments = await db().select().from(t.payments).where(eq(t.payments.billId, billId));
  const settled = payments.filter((p) => p.state === "SUCCESS").reduce((a, p) => a + p.amountPaise, 0);
  if (settled >= bill.totalPaise) {
    const now = Date.now();
    await db().update(t.bills).set({ state: "PAID", paidAt: now }).where(eq(t.bills.id, billId));
    const session = (await db().select().from(t.sessions).where(eq(t.sessions.id, bill.sessionId)).limit(1))[0];
    if (session) {
      await db().update(t.sessions).set({ state: "PAID", closedAt: now }).where(eq(t.sessions.id, session.id));
      await db().update(t.orders).set({ state: "PAID" }).where(and(eq(t.orders.sessionId, session.id), ne(t.orders.state, "CANCELLED"), ne(t.orders.state, "REJECTED")));
      // paid → the table is dirty, not free. Staff taps "Table ready" after clearing it.
      await db().update(t.tables).set({ state: "CLEANING", stateSince: now }).where(eq(t.tables.id, session.tableId));
    }
    return { paid: true as const, state: "PAID" as const };
  }
  if (settled > 0 && bill.state !== "PARTIALLY_PAID") {
    await db().update(t.bills).set({ state: "PARTIALLY_PAID" }).where(eq(t.bills.id, billId));
    return { paid: false as const, state: "PARTIALLY_PAID" as const, settled, total: bill.totalPaise };
  }
  return { paid: false as const, state: bill.state, settled, total: bill.totalPaise };
}

export async function billSummaryForSession(sessionId: string) {
  const rows = await db()
    .select()
    .from(t.bills)
    .where(eq(t.bills.sessionId, sessionId))
    .orderBy(sql`${t.bills.createdAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}

export async function collectCash(billId: string, staffId: string) {
  const now = Date.now();
  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, billId)).limit(1))[0];
  if (!bill) throw new DomainError("NOT_FOUND", "Bill mila nahi.", 404);
  const payments = await db().select().from(t.payments).where(eq(t.payments.billId, billId));
  const pendingCash = payments.find((p) => p.method === "CASH" && p.state === "PENDING");
  if (pendingCash) {
    await db().update(t.payments).set({ state: "SUCCESS", settledAt: now, collectedByStaffId: staffId, providerRef: `cash_${staffId}` }).where(eq(t.payments.id, pendingCash.id));
  } else {
    const settled = payments.filter((p) => p.state === "SUCCESS").reduce((a, p) => a + p.amountPaise, 0);
    const remaining = bill.totalPaise - settled;
    if (remaining <= 0) throw new DomainError("CONFLICT", "Bill already fully paid hai.");
    await db().insert(t.payments).values({
      id: newId("pay"), billId, splitId: null, method: "CASH", state: "SUCCESS", amountPaise: remaining,
      providerRef: `cash_${staffId}`, idempotencyKey: `cash-${billId}-${now}`, createdAt: now, settledAt: now,
      collectedByStaffId: staffId,
    });
  }
  const result = await settleBillIfCovered(billId);
  return result;
}
