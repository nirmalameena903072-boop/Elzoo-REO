import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { settlePayment } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;
    const result = await settlePayment(id, { kind: "staff", staffId: staff.staffId });
    return ok({ state: result.payment.state, billPaid: result.bill.paid, billState: result.bill.state ?? null });
  });
}
