import { notFound } from "next/navigation";
import { ensureDb } from "@/lib/db";
import { deviceIdForRequest, resolveDiner } from "@/lib/server/session-init";
import { getMenu, getSessionOrders } from "@/lib/db/queries";
import { MenuExperience } from "@/components/diner/MenuExperience";

export const dynamic = "force-dynamic";

export default async function MenuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureDb();
  if (!/^T\d{1,2}$/i.test(token)) notFound();

  const deviceId = await deviceIdForRequest();
  const diner = await resolveDiner(token.toUpperCase(), deviceId);
  const [{ categories, items }, orders] = await Promise.all([getMenu(), getSessionOrders(diner.session.id)]);

  return (
    <MenuExperience
      diner={{
        tableNumber: diner.table.number,
        guestId: diner.guest.id,
        guestName: diner.guest.name,
        guestCount: diner.guests.length,
        sessionId: diner.session.id,
        tableState: diner.table.state,
      }}
      menu={{
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
        items: items.map((i) => ({
          id: i.id, name: i.name, nameHi: i.nameHi, slug: i.slug, description: i.description,
          pricePaise: i.pricePaise, diet: i.diet, spice: i.spice, station: i.station,
          prepMinutes: i.prepMinutes, available: i.available, categoryId: i.categoryId,
          allergens: i.allergens,
        })),
      }}
      activeOrders={orders.filter((o) => !["PAID", "CANCELLED", "REJECTED"].includes(o.state)).map((o) => ({ id: o.id, number: o.number, state: o.state }))}
    />
  );
}
