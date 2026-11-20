import { it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { resetDb, db, ensureDb } from "@/lib/db";

it("seeds the demo dataset", async () => {
  await ensureDb();
  await resetDb();
  const rows = async (q: string) => (await db().run(sql.raw(q))).rows;
  const counts: Record<string, number> = {};
  for (const table of ["outlets","tables","staff","menu_items","sessions","guests","orders","order_items","bills","payments","reviews","waiter_calls","platform_outlets","audit_log","kot_tickets"]) {
    counts[table] = Number((await rows(`SELECT COUNT(*) AS n FROM ${table}`))[0]?.n ?? 0);
  }
  console.log(counts);
  const rev = await rows("SELECT AVG(rating) AS a FROM reviews");
  console.log("avg rating", Number(rev[0]?.a).toFixed(2));
  const days = await rows("SELECT date(placed_at/1000,'unixepoch') d, COUNT(*) n FROM orders WHERE state='PAID' GROUP BY d ORDER BY d");
  console.log(days.map((r) => `${r.d}=${r.n}`).join(" "));
  expect(counts.menu_items).toBe(27);
  expect(counts.tables).toBe(12);
});
