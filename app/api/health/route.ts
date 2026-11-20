import { sql } from "drizzle-orm";
import { db, ensureDb, dbTarget, isPersistent } from "@/lib/db";
import { ok, handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await ensureDb();
    const counts = await db().run(sql.raw(`
      SELECT
        (SELECT COUNT(*) FROM outlets) AS outlets,
        (SELECT COUNT(*) FROM tables) AS tables,
        (SELECT COUNT(*) FROM menu_items) AS menu_items,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM reviews) AS reviews
    `));
    const row = counts.rows[0] ?? {};
    return ok({
      db: "ok",
      seeded: Number(row.outlets ?? 0) > 0,
      counts: {
        outlets: Number(row.outlets ?? 0),
        tables: Number(row.tables ?? 0),
        menuItems: Number(row.menu_items ?? 0),
        orders: Number(row.orders ?? 0),
        reviews: Number(row.reviews ?? 0),
      },
      storage: dbTarget().kind,
      // loud when state can't survive: says exactly what a deployer is looking at
      persistent: isPersistent(),
      storageNote: isPersistent()
        ? "Turso — state is shared across instances."
        : dbTarget().kind === "ephemeral"
          ? "Per-instance /tmp file. Writes are not shared between lambdas and reset on cold start. Set TURSO_DATABASE_URL for real persistence."
          : "Local SQLite file.",
      version: "1.0.0",
    });
  });
}
