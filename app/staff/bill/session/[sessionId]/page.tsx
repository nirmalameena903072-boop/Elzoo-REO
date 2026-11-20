import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, ensureDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { getStaffSession } from "@/lib/auth/session";
import { generateBillForSession } from "@/lib/domain/billing";

export const dynamic = "force-dynamic";

/**
 * The floor board's "Open bill" button. It resolves a session to a bill — creating one if
 * the table is still eating — and hands off to the bill desk. Idempotent by construction.
 */
export default async function SessionBillPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await ensureDb();
  const staff = await getStaffSession();
  if (!staff) redirect("/staff/login");
  const { sessionId } = await params;

  const existing = await db()
    .select()
    .from(t.bills)
    .where(eq(t.bills.sessionId, sessionId))
    .orderBy(desc(t.bills.createdAt))
    .limit(1);

  if (existing[0]) redirect(`/staff/bill/${existing[0].id}`);

  const { bill } = await generateBillForSession(sessionId, staff.staffId);
  redirect(`/staff/bill/${bill.id}`);
}
