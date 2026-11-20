import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { verifyPin } from "@/lib/utils/ids";
import { staff } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { applyDiscount } from "@/lib/domain/billing";
import { DomainError } from "@/lib/domain/errors";
import { newId } from "@/lib/utils/ids";
import { auditLog } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const Schema = z.object({
  amountPaise: z.number().int().min(0).max(5_000_000),
  reason: z.string().min(2).max(80),
  managerPin: z.string().regex(/^\d{4}$/),
});

/** A discount is a manager act. A waiter's PIN never works here — and a failed attempt is logged. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const session = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;
    const body = Schema.parse(await readJson(request));

    const managers = await db().select().from(staff).where(eq(staff.active, true));
    const approver = managers.find((m) => (m.role === "MANAGER" || m.role === "OWNER") && verifyPin(body.managerPin, m.pinHash));

    if (!approver) {
      await db().insert(auditLog).values({
        id: newId("aud"),
        outletId: session.outletId,
        staffId: session.staffId,
        action: "discount.denied",
        entity: "bill",
        entityId: id,
        meta: JSON.stringify({ attemptedBy: session.role, amountPaise: body.amountPaise }),
        createdAt: Date.now(),
      });
      throw new DomainError("FORBIDDEN", "Discount ke liye manager PIN chahiye. Yeh attempt log ho gaya.", 403);
    }

    const result = await applyDiscount(id, {
      amountPaise: body.amountPaise,
      reason: body.reason,
      staffId: approver.id,
    });
    return ok({ ...result, approvedBy: approver.name });
  });
}
