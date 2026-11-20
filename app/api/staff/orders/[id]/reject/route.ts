import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureDb, db } from "@/lib/db";
import { orders, tables } from "@/lib/db/schema";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff, assertSection } from "@/lib/auth/guard";
import { rejectOrder } from "@/lib/domain/orders";
import { DomainError } from "@/lib/domain/errors";

export const dynamic = "force-dynamic";

const Schema = z.object({
  reason: z.enum(["ITEM_UNAVAILABLE", "KITCHEN_CLOSED", "TABLE_MISMATCH", "DUPLICATE", "OTHER"]),
  note: z.string().max(120).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;
    const body = Schema.parse(await readJson(request));

    const order = (await db().select().from(orders).where(eq(orders.id, id)).limit(1))[0];
    if (!order) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
    const tableRow = (await db().select().from(tables).where(eq(tables.id, order.tableId)).limit(1))[0];
    if (!tableRow) throw new DomainError("NOT_FOUND", "Table mila nahi.", 404);
    assertSection(staff, tableRow.section);

    await rejectOrder(id, { reason: body.reason, note: body.note ?? null, staffId: staff.staffId });
    return ok({ rejected: true });
  });
}
