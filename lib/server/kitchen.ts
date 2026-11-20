import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { startOfDay } from "@/lib/utils/time";

export async function kitchenBoard() {
  const rows = await db()
    .select({
      itemId: t.orderItems.id,
      orderId: t.orderItems.orderId,
      orderNumber: t.orders.number,
      tableNumber: t.tables.number,
      name: t.orderItems.nameSnapshot,
      qty: t.orderItems.qty,
      notes: t.orderItems.notes,
      state: t.orderItems.state,
      station: t.orderItems.station,
      prepMinutes: t.orderItems.prepMinutes,
      startedAt: t.orderItems.startedAt,
      readyAt: t.orderItems.readyAt,
      placedAt: t.orders.placedAt,
      guest: t.guests.name,
    })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .innerJoin(t.tables, eq(t.tables.id, t.orders.tableId))
    .leftJoin(t.guests, eq(t.guests.id, t.orderItems.guestId))
    .where(
      and(
        inArray(t.orderItems.state, ["QUEUED", "PREPARING", "READY"]),
        inArray(t.orders.state, ["ACCEPTED", "IN_KITCHEN", "PREPARING", "READY"]),
      ),
    )
    .orderBy(asc(t.orders.placedAt));

  const start = startOfDay(Date.now());
  const served = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.orderItems)
    .where(and(eq(t.orderItems.state, "SERVED"), gte(t.orderItems.servedAt, start)));
  const avg = await db()
    .select({ avg: sql<number>`COALESCE(AVG(${t.orders.servedAt} - ${t.orders.acceptedAt}), 0)` })
    .from(t.orders)
    .where(and(gte(t.orders.servedAt, start), sql`${t.orders.acceptedAt} IS NOT NULL`));

  const availability = await db()
    .select({ id: t.menuItems.id, name: t.menuItems.name, station: t.menuItems.station, available: t.menuItems.available })
    .from(t.menuItems)
    .orderBy(asc(t.menuItems.sort));

  return {
    serverNow: Date.now(),
    tickets: rows.map((r) => ({
      ...r,
      state: r.state as "QUEUED" | "PREPARING" | "READY",
      isNew: r.state === "QUEUED",
    })),
    coversToday: Number(served[0]?.n ?? 0),
    avgTicketMs: Number(avg[0]?.avg ?? 0),
    availability,
  };
}
