import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { verifyPin } from "@/lib/utils/ids";

/** Demo PINs are shared by role, so a PIN resolves to the first matching active staff member. */
export async function findStaffByPin(pin: string): Promise<typeof staff.$inferSelect | null> {
  if (!/^\d{4}$/.test(pin)) return null;
  const rows = await db().select().from(staff).where(eq(staff.active, true));
  for (const row of rows) {
    if (verifyPin(pin, row.pinHash)) return row;
  }
  return null;
}
