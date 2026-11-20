import { z } from "zod";
import { eq } from "drizzle-orm";
import { ensureDb, db } from "@/lib/db";
import { tables } from "@/lib/db/schema";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff, assertSection } from "@/lib/auth/guard";
import { tableReady } from "@/lib/domain/orders";

export const dynamic = "force-dynamic";

const Schema = z.object({}).optional();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;
    await readJson(request).catch(() => Schema.parse({}));

    const tableRow = (await db().select().from(tables).where(eq(tables.id, id)).limit(1))[0];
    if (!tableRow) return ok({ error: "missing" });
    assertSection(staff, tableRow.section);

    await tableReady(id, staff.staffId);
    return ok({ state: "FREE" });
  });
}
