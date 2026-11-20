import { asc, eq } from "drizzle-orm";
import { db, ensureDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { OUTLET_ID } from "@/lib/db/constants";
import { AdminShell } from "@/components/admin/AdminShell";
import { MenuBoard, type MenuRow } from "@/components/admin/MenuBoard";

export const dynamic = "force-dynamic";

export default async function AdminMenu() {
  await ensureDb();
  const rows = await db()
    .select({ item: t.menuItems, category: t.menuCategories.name })
    .from(t.menuItems)
    .leftJoin(t.menuCategories, eq(t.menuCategories.id, t.menuItems.categoryId))
    .where(eq(t.menuItems.outletId, OUTLET_ID))
    .orderBy(asc(t.menuItems.sort));

  const items: MenuRow[] = rows.map(({ item, category }) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    pricePaise: item.pricePaise,
    station: item.station,
    diet: item.diet,
    spice: item.spice,
    available: item.available,
    pinned: item.pinned,
    category: category ?? "—",
    prepMinutes: item.prepMinutes,
  }));

  return (
    <AdminShell active="menu" title="Menu" subtitle="Prices, stations, and what's off tonight.">
      <MenuBoard items={items} />
    </AdminShell>
  );
}
