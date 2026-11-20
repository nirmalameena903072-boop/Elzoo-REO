import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson, requireIdempotencyKey } from "@/lib/http";
import { createPaymentIntent } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

const Schema = z.object({
  billId: z.string().min(4),
  method: z.enum(["UPI", "CASH", "CARD", "WALLET"]),
  splitId: z.string().nullable().optional(),
  amountPaise: z.number().int().min(1).optional(),
});

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const key = requireIdempotencyKey(request);
    const body = Schema.parse(await readJson(request));
    const result = await createPaymentIntent({
      billId: body.billId,
      method: body.method,
      splitId: body.splitId ?? null,
      amountPaise: body.amountPaise,
      idempotencyKey: key,
    });
    return ok({
      paymentId: result.payment.id,
      state: result.payment.state,
      amountPaise: result.payment.amountPaise,
      method: result.payment.method,
      qrSvg: result.qrSvg ?? null,
      reused: result.reused,
    });
  });
}
