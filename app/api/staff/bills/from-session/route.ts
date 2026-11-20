import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { ensureDb, db } from "@/lib/db";
import { sessions, tables } from "@/lib/db/schema";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff, assertSection } from "@/lib/auth/guard";
import { generateBillForSession } from "@/lib/domain/billing";
import { resolveCall } from "@/lib/domain/orders";
import { waiterCalls } from "@/lib/db/schema";
import { DomainError } from "@/lib/domain/errors";

export const dynamic = "force-dynamic";

const Schema = z.object({ tableId: z.string().min(3), sessionId: z.string().optional() });

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const body = Schema.parse(await readJson(request));

    const tableRow = (await db().select().from(tables).where(eq(tables.id, body.tableId)).limit(1))[0];
    if (!tableRow) throw new DomainError("NOT_FOUND", "Table mila nahi.", 404);
    assertSection(staff, tableRow.section);

    const session = body.sessionId
      ? (await db().select().from(sessions).where(eq(sessions.id, body.sessionId)).limit(1))[0]
      : (await db().select().from(sessions).where(eq(sessions.tableId, body.tableId)).orderBy(desc(sessions.openedAt)).limit(1))[0];
    if (!session) throw new DomainError("NOT_FOUND", "Session mila nahi.", 404);

    const { bill } = await generateBillForSession(session.id, staff.staffId);

    // closing the loop on the call that asked for it
    const openCall = (await db().select().from(waiterCalls).where(eq(waiterCalls.sessionId, session.id)).orderBy(desc(waiterCalls.createdAt)).limit(1))[0];
    if (openCall && !openCall.resolvedAt) await resolveCall(openCall.id, staff.staffId);

    return ok({ billId: bill.id, redirect: `/staff/bill/${bill.id}` });
  });
}
