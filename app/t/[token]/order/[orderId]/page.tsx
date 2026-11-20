import { notFound } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db, ensureDb } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { getOrderWithItems } from "@/lib/db/queries";
import { OrderStatus } from "@/components/diner/OrderStatus";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ token: string; orderId: string }>;
}) {
  const { token, orderId } = await params;
  await ensureDb();
  if (!/^T\d{1,2}$/i.test(token)) notFound();

  const found = await getOrderWithItems(orderId);
  if (!found || found.table?.number !== token.toUpperCase()) notFound();

  // Rejected orders offer two real alternatives from the same station, not a dead end.
  const station = found.items[0]?.station;
  const alternatives = station
    ? await db()
        .select({ id: menuItems.id, name: menuItems.name, slug: menuItems.slug, pricePaise: menuItems.pricePaise, prepMinutes: menuItems.prepMinutes })
        .from(menuItems)
        .where(and(eq(menuItems.station, station), eq(menuItems.available, true), ne(menuItems.id, found.items[0]?.menuItemId ?? "")))
        .limit(2)
    : await db()
        .select({ id: menuItems.id, name: menuItems.name, slug: menuItems.slug, pricePaise: menuItems.pricePaise, prepMinutes: menuItems.prepMinutes })
        .from(menuItems)
        .where(inArray(menuItems.id, ["itm_dal_makhani", "itm_paneer_tikka"]))
        .limit(2);

  const initial = {
    serverNow: Date.now(),
    order: {
      id: found.order.id,
      number: found.order.number,
      state: found.order.state,
      totalPaise: found.order.totalPaise,
      placedAt: found.order.placedAt,
      acceptedAt: found.order.acceptedAt,
      readyAt: found.order.readyAt,
      servedAt: found.order.servedAt,
      rejectReason: found.order.rejectReason,
      rejectNote: found.order.rejectNote,
      note: found.order.note,
    },
    items: found.items.map((i) => ({
      id: i.id, name: i.nameSnapshot, qty: i.qty, notes: i.notes, state: i.state,
      station: i.station, prepMinutes: i.prepMinutes, startedAt: i.startedAt, readyAt: i.readyAt,
    })),
  };

  return (
    <OrderStatus
      orderId={found.order.id}
      tableNumber={token.toUpperCase()}
      initial={{ ok: true, data: initial }}
      alternatives={alternatives}
      alreadyPaid={found.order.state === "PAID"}
    />
  );
}
