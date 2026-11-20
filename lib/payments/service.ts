import { and, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { DomainError } from "@/lib/domain/errors";
import { settleBillIfCovered } from "@/lib/domain/billing";
import { newId } from "@/lib/utils/ids";
import { paymentProvider } from "./mock";

export async function createPaymentIntent(args: {
  billId: string;
  method: t.PaymentMethod;
  splitId?: string | null;
  amountPaise?: number;
  idempotencyKey: string;
}) {
  const existing = await db().select().from(t.payments).where(eq(t.payments.idempotencyKey, args.idempotencyKey)).limit(1);
  if (existing[0]) return { payment: existing[0], reused: true, qrSvg: null };

  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, args.billId)).limit(1))[0];
  if (!bill) throw new DomainError("NOT_FOUND", "Bill mila nahi.", 404);
  if (bill.state === "PAID") throw new DomainError("CONFLICT", "Bill already paid hai.");
  if (bill.state === "VOID") throw new DomainError("CONFLICT", "Yeh bill void ho chuka hai.");

  const payments = await db().select().from(t.payments).where(eq(t.payments.billId, args.billId));
  const alreadyCommitted = payments
    .filter((p) => p.state === "SUCCESS" || p.state === "PENDING")
    .reduce((a, p) => a + p.amountPaise, 0);

  let amount = args.amountPaise ?? bill.totalPaise - alreadyCommitted;
  if (args.splitId) {
    const split = (await db().select().from(t.billSplits).where(eq(t.billSplits.id, args.splitId)).limit(1))[0];
    if (!split) throw new DomainError("NOT_FOUND", "Split mila nahi.", 404);
    if (split.paid) throw new DomainError("CONFLICT", "Yeh hissa already paid hai.");
    amount = split.amountPaise;
  }
  if (amount <= 0) throw new DomainError("CONFLICT", "Is bill pe kuch bacha nahi.");
  if (alreadyCommitted + amount > bill.totalPaise) {
    throw new DomainError("VALIDATION", "Yeh amount bill se zyada ho raha hai.", 400);
  }

  const outlet = (await db().select().from(t.outlets).where(eq(t.outlets.id, bill.outletId)).limit(1))[0]!;
  const intent = await paymentProvider.createIntent({
    amountPaise: amount, upiId: outlet.upiId, note: `Bill ${bill.number}`, method: args.method,
  });

  const id = newId("pay");
  const row = {
    id, billId: args.billId, splitId: args.splitId ?? null, method: args.method, state: "PENDING" as t.PaymentState,
    amountPaise: amount, providerRef: intent.providerRef, upiIntent: intent.upiIntent,
    idempotencyKey: args.idempotencyKey, createdAt: Date.now(), settledAt: null, collectedByStaffId: null,
  };
  await db().insert(t.payments).values(row);

  let qrSvg: string | null = null;
  if (args.method === "UPI" && intent.upiIntent) {
    qrSvg = await QRCode.toString(intent.upiIntent, {
      type: "svg", margin: 0, width: 264,
      color: { dark: "#0A0B0D", light: "#F7F2E8" },
      errorCorrectionLevel: "M",
    });
  }
  return { payment: row, reused: false, qrSvg, settleAfterMs: intent.settleAfterMs };
}

/** The only way a payment becomes SUCCESS. Called by the diner's "simulate" button or staff cash collection. */
export async function settlePayment(paymentId: string, by: { kind: "customer" } | { kind: "staff"; staffId: string }) {
  const payment = (await db().select().from(t.payments).where(eq(t.payments.id, paymentId)).limit(1))[0];
  if (!payment) throw new DomainError("NOT_FOUND", "Payment nahi mila.", 404);
  if (payment.state === "SUCCESS") {
    const bill = await settleBillIfCovered(payment.billId);
    return { payment, bill };
  }
  if (payment.state !== "PENDING") throw new DomainError("CONFLICT", "Yeh payment ab settle nahi hoga.");

  if (payment.method === "CASH" && by.kind === "customer") {
    throw new DomainError("FORBIDDEN", "Cash staff confirm karta hai — waiter ko bula liya hai.", 403);
  }

  const result = await paymentProvider.simulateSettlement({ providerRef: payment.providerRef ?? payment.id, amountPaise: payment.amountPaise });
  if (result.state !== "SUCCESS") {
    await db().update(t.payments).set({ state: "FAILED" }).where(eq(t.payments.id, paymentId));
    throw new DomainError("CONFLICT", "Payment fail ho gaya — dobara try karein.", 402);
  }

  const now = Date.now();
  await db()
    .update(t.payments)
    .set({
      state: "SUCCESS", settledAt: now,
      collectedByStaffId: by.kind === "staff" ? by.staffId : null,
      providerRef: result.providerRef,
    })
    .where(eq(t.payments.id, paymentId));

  if (payment.splitId) {
    await db().update(t.billSplits).set({ paid: true, paymentId }).where(eq(t.billSplits.id, payment.splitId));
  }
  const bill = await settleBillIfCovered(payment.billId);
  return { payment: { ...payment, state: "SUCCESS" as t.PaymentState, settledAt: now }, bill };
}

/**
 * Staff-side cash intent. The waiter is standing at the table, so the amount is what's
 * actually left on the bill — no split arithmetic, no over-collection.
 */
export async function createCashIntent(args: { billId: string; staffId: string; idempotencyKey: string }) {
  return createPaymentIntent({ billId: args.billId, method: "CASH", idempotencyKey: args.idempotencyKey });
}

export async function getPaymentState(paymentId: string) {
  const payment = (await db().select().from(t.payments).where(eq(t.payments.id, paymentId)).limit(1))[0];
  if (!payment) return null;
  const settled = await db().select().from(t.payments).where(and(eq(t.payments.billId, payment.billId), eq(t.payments.state, "SUCCESS")));
  return {
    payment,
    settledPaise: settled.reduce((a, p) => a + p.amountPaise, 0),
  };
}

export async function paymentsForBill(billId: string) {
  return db().select().from(t.payments).where(eq(t.payments.billId, billId));
}
