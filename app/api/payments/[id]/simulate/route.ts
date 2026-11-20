import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { settlePayment } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/** The mock provider's settling webhook, from the diner's own device. Never called before payment exists. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const { id } = await params;
    const result = await settlePayment(id, { kind: "customer" });
    return ok({
      paymentId: id,
      state: result.payment.state,
      amountPaise: result.payment.amountPaise,
      billPaid: result.bill.paid,
      billState: result.bill.state ?? null,
    });
  });
}
