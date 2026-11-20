import { eq } from "drizzle-orm";
import { ensureDb, db } from "@/lib/db";
import { waiterCalls, tables } from "@/lib/db/schema";
import { handle, ok } from "@/lib/http";
import { requireStaff, assertSection } from "@/lib/auth/guard";
import { acknowledgeCall } from "@/lib/domain/orders";
import { DomainError } from "@/lib/domain/errors";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;
    const call = (await db().select().from(waiterCalls).where(eq(waiterCalls.id, id)).limit(1))[0];
    if (!call) throw new DomainError("NOT_FOUND", "Call mila nahi.", 404);
    const tableRow = (await db().select().from(tables).where(eq(tables.id, call.tableId)).limit(1))[0];
    if (tableRow) assertSection(staff, tableRow.section);
    await acknowledgeCall(id, staff.staffId);
    return ok({ acknowledged: true });
  });
}
