import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { createCashIntent } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;
    const result = await createCashIntent({ billId: id, staffId: staff.staffId, idempotencyKey: `cash-${id}-${staff.staffId}` });
    return ok({ paymentId: result.payment.id, amountPaise: result.payment.amountPaise });
  });
}
