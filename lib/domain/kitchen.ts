import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { DomainError } from "./errors";
import { assertItemTransition } from "./transitions";
import { syncOrderState } from "./orders";

/** 86 / un-86. Reflects on the diner menu at the next poll, no caching layer to bust. */
export async function setAvailability(itemId: string, available: boolean, staffId: string, reason?: string | null) {
  const rows = await db().select().from(t.menuItems).where(eq(t.menuItems.id, itemId)).limit(1);
  const item = rows[0];
  if (!item) throw new DomainError("NOT_FOUND", "Item mila nahi.", 404);
  await db()
    .update(t.menuItems)
    .set({ available, unavailableReason: available ? null : (reason?.slice(0, 60) ?? "Aaj nahi hai") })
    .where(eq(t.menuItems.id, itemId));
  await db().insert(t.auditLog).values({
    id: `aud_${crypto.randomUUID().slice(0, 12)}`,
    outletId: item.outletId,
    staffId,
    action: available ? "menu.available" : "menu.86",
    entity: "menu_item",
    entityId: itemId,
    meta: JSON.stringify({ name: item.name }),
    createdAt: Date.now(),
  });
  return { item: { ...item, available } };
}

export async function setItemState(itemId: string, state: "PREPARING" | "READY", staffId: string) {
  const now = Date.now();
  const rows = await db().select().from(t.orderItems).where(eq(t.orderItems.id, itemId)).limit(1);
  const item = rows[0];
  if (!item) throw new DomainError("NOT_FOUND", "Ticket mila nahi.", 404);
  assertItemTransition(item.state, state);

  if (state === "PREPARING") {
    const order = (await db().select().from(t.orders).where(eq(t.orders.id, item.orderId)).limit(1))[0];
    if (order && order.state === "ACCEPTED") {
      await db().update(t.orders).set({ state: "IN_KITCHEN" }).where(eq(t.orders.id, item.orderId));
    }
    await db().update(t.orderItems).set({ state, startedAt: item.startedAt ?? now }).where(eq(t.orderItems.id, itemId));
  } else {
    await db().update(t.orderItems).set({ state, readyAt: now }).where(eq(t.orderItems.id, itemId));
  }
  void staffId;
  await syncOrderState(item.orderId);
  return { ok: true };
}

/** Bump: everything on this station for this order goes ready at once. */
export async function bumpOrderStation(orderId: string, station: t.Station | null, staffId: string) {
  const now = Date.now();
  const rows = await db().select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId));
  const target = rows.filter((i) => i.state !== "CANCELLED" && i.state !== "SERVED" && (station === null || i.station === station));
  for (const item of target) {
    if (item.state === "QUEUED") {
      await db().update(t.orderItems).set({ state: "PREPARING", startedAt: item.startedAt ?? now }).where(eq(t.orderItems.id, item.id));
    }
    await db().update(t.orderItems).set({ state: "READY", readyAt: now }).where(and(eq(t.orderItems.id, item.id), eq(t.orderItems.state, "PREPARING")));
  }
  void staffId;
  await syncOrderState(orderId);
  return { ok: true, bumped: target.length };
}

export async function recallItem(itemId: string) {
  const now = Date.now();
  const rows = await db().select().from(t.orderItems).where(eq(t.orderItems.id, itemId)).limit(1);
  const item = rows[0];
  if (!item) throw new DomainError("NOT_FOUND", "Ticket mila nahi.", 404);
  if (item.state !== "READY") throw new DomainError("ILLEGAL_TRANSITION", "Sirf ready ticket recall ho sakti hai.");
  if (!item.readyAt || now - item.readyAt > 20_000) {
    throw new DomainError("ILLEGAL_TRANSITION", "Recall ka 20 second window nikal gaya — floor ko bata dein.");
  }
  await db().update(t.orderItems).set({ state: "PREPARING", readyAt: null }).where(eq(t.orderItems.id, itemId));
  await syncOrderState(item.orderId);
  return { ok: true };
}

/** Proactive delay flag: an unfinished item past prep_minutes + 5. */
export function isItemDelayed(item: { state: t.ItemState; startedAt: number | null; prepMinutes: number }, now = Date.now()): boolean {
  if (item.state !== "PREPARING" || !item.startedAt) return false;
  return now - item.startedAt > (item.prepMinutes + 5) * 60_000;
}
