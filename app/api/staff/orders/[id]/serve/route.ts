import { eq } from "drizzle-orm";
import { ensureDb, db } from "@/lib/db";
import { orders, tables } from "@/lib/db/schema";
import { handle, ok } from "@/lib/http";
import { requireStaff, assertSection } from "@/lib/auth/guard";
import { serveOrder } from "@/lib/domain/orders";
import { DomainError } from "@/lib/domain/errors";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;

    const order = (await db().select().from(orders).where(eq(orders.id, id)).limit(1))[0];
    if (!order) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
    const tableRow = (await db().select().from(tables).where(eq(tables.id, order.tableId)).limit(1))[0];
    if (!tableRow) throw new DomainError("NOT_FOUND", "Table mila nahi.", 404);
    assertSection(staff, tableRow.section);

    await serveOrder(id, staff.staffId);
    return ok({ served: true });
  });
}
