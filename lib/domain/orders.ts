import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { DomainError } from "./errors";
import { assertOrderTransition, type Actor } from "./transitions";
import { nextKotNumber, nextOrderNumber } from "@/lib/db/queries";
import { newId } from "@/lib/utils/ids";

export type PlaceOrderLine = { menuItemId: string; qty: number; notes?: string | null };

/**
 * PLACED. Idempotent on the client key: the same key returns the same order, never a second row.
 */
export async function placeOrder(args: {
  sessionId: string;
  tableId: string;
  guestId: string;
  outletId: string;
  lines: PlaceOrderLine[];
  note?: string | null;
  idempotencyKey: string;
}) {
  const existing = await db().select().from(t.orders).where(eq(t.orders.idempotencyKey, args.idempotencyKey)).limit(1);
  if (existing[0]) {
    const items = await db().select().from(t.orderItems).where(eq(t.orderItems.orderId, existing[0].id));
    return { order: existing[0], items, reused: true };
  }

  if (args.lines.length === 0) throw new DomainError("VALIDATION", "Cart khali hai — pehle koi dish add karein.", 400);
  const ids = args.lines.map((l) => l.menuItemId);
  const menuRows = await db().select().from(t.menuItems).where(sql`${t.menuItems.id} IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
  const menu = new Map(menuRows.map((m) => [m.id, m]));

  for (const line of args.lines) {
    const item = menu.get(line.menuItemId);
    if (!item) throw new DomainError("VALIDATION", "Menu item abhi available nahi hai.", 400);
    if (!item.available) throw new DomainError("VALIDATION", `${item.name} aaj nahi hai — kitchen ne hata diya.`, 409);
    if (line.qty < 1 || line.qty > 20) throw new DomainError("VALIDATION", "Quantity 1 se 20 ke beech honi chahiye.", 400);
  }

  const total = args.lines.reduce((acc, l) => acc + (menu.get(l.menuItemId)?.pricePaise ?? 0) * l.qty, 0);
  const orderId = newId("ord");
  const number = await nextOrderNumber();

  const order = {
    id: orderId,
    outletId: args.outletId,
    sessionId: args.sessionId,
    tableId: args.tableId,
    guestId: args.guestId,
    number,
    state: "PLACED" as t.OrderState,
    totalPaise: total,
    note: args.note ?? null,
    rejectReason: null,
    rejectNote: null,
    staffId: null,
    placedAt: Date.now(),
    acceptedAt: null,
    readyAt: null,
    servedAt: null,
    idempotencyKey: args.idempotencyKey,
  };
  await db().insert(t.orders).values(order);

  const itemValues = args.lines.map((l) => {
    const m = menu.get(l.menuItemId)!;
    return {
      id: newId("oit"),
      orderId,
      menuItemId: m.id,
      nameSnapshot: m.name,
      pricePaise: m.pricePaise,
      qty: l.qty,
      notes: l.notes?.slice(0, 80) ?? null,
      guestId: args.guestId,
      state: "QUEUED" as t.ItemState,
      station: m.station,
      prepMinutes: m.prepMinutes,
      startedAt: null,
      readyAt: null,
      servedAt: null,
      cancelledReason: null,
    };
  });
  await db().insert(t.orderItems).values(itemValues);

  // a table that was seated/free moves into ORDERING the moment food is placed
  const tableRow = await db().select().from(t.tables).where(eq(t.tables.id, args.tableId)).limit(1);
  if (tableRow[0] && (tableRow[0].state === "SEATED" || tableRow[0].state === "FREE")) {
    await db().update(t.tables).set({ state: "ORDERING", stateSince: Date.now() }).where(eq(t.tables.id, args.tableId));
  }

  return { order, items: itemValues, reused: false };
}

/** Duplicate guard: same item, same notes, same table, inside 10 minutes. Warning only — never blocks. */
export async function findRecentDuplicates(sessionId: string, lines: PlaceOrderLine[]) {
  const since = Date.now() - 10 * 60_000;
  const rows = await db()
    .select({ menuItemId: t.orderItems.menuItemId, name: t.orderItems.nameSnapshot, notes: t.orderItems.notes, guest: t.guests.name, at: t.orders.placedAt })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .leftJoin(t.guests, eq(t.guests.id, t.orderItems.guestId))
    .where(and(eq(t.orders.sessionId, sessionId), sql`${t.orders.placedAt} >= ${since}`));
  return lines
    .map((line) => {
      const hit = rows.find((r) => r.menuItemId === line.menuItemId && (r.notes ?? "") === (line.notes ?? ""));
      return hit ? { name: hit.name, guest: hit.guest } : null;
    })
    .filter((v): v is { name: string; guest: string | null } => v !== null);
}

export async function acceptOrder(orderId: string, staffId: string, actor: Actor = "staff") {
  await db().transaction(async (tx) => {
    const rows = await tx.select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1);
    const order = rows[0];
    if (!order) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
    assertOrderTransition({ from: order.state, to: "ACCEPTED", actor, placedAt: order.placedAt, now: Date.now() });
    const now = Date.now();
    await tx.update(t.orders).set({ state: "ACCEPTED", acceptedAt: now, staffId }).where(eq(t.orders.id, orderId));

    // one KOT per station, grouped from the item rows
    const items = await tx.select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId));
    const stations = [...new Set(items.map((i) => i.station))];
    let no = await nextKotNumber();
    const tickets: Array<{ station: t.Station; number: number }> = [];
    for (const station of stations) {
      const payload = items.filter((i) => i.station === station).map((i) => ({ name: i.nameSnapshot, qty: i.qty, notes: i.notes }));
      await tx.insert(t.kotTickets).values({
        id: newId("kot"), orderId, station, number: no, printedAt: now, payload: JSON.stringify(payload),
      });
      tickets.push({ station, number: no });
      no += 1;
    }

    // items hit the kitchen immediately; the order follows the items
    await tx.update(t.orderItems).set({ state: "QUEUED" }).where(and(eq(t.orderItems.orderId, orderId), eq(t.orderItems.state, "QUEUED")));
    const tableRows = await tx.select().from(t.tables).where(eq(t.tables.id, order.tableId)).limit(1);
    if (tableRows[0] && tableRows[0].state === "ORDERING") {
      await tx.update(t.tables).set({ state: "DINING", stateSince: now }).where(eq(t.tables.id, order.tableId));
    }
    return tickets;
  });

  const items = await db().select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId));
  const stations = [...new Set(items.map((i) => i.station))];
  const order = (await db().select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1))[0]!;
  return { order, stations };
}

export async function rejectOrder(orderId: string, args: { reason: t.RejectReason; note?: string | null; staffId: string }) {
  const rows = await db().select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
  assertOrderTransition({ from: order.state, to: "REJECTED", actor: "staff", placedAt: order.placedAt, now: Date.now(), note: args.note });
  await db().update(t.orders).set({ state: "REJECTED", rejectReason: args.reason, rejectNote: args.note ?? null, staffId: args.staffId }).where(eq(t.orders.id, orderId));
  await db().update(t.orderItems).set({ state: "CANCELLED", cancelledReason: args.reason }).where(eq(t.orderItems.orderId, orderId));
  await db().insert(t.auditLog).values({
    id: newId("aud"), outletId: order.outletId, staffId: args.staffId, action: "order.rejected",
    entity: "order", entityId: orderId, meta: JSON.stringify({ reason: args.reason, note: args.note ?? "" }), createdAt: Date.now(),
  });
  return { order: { ...order, state: "REJECTED" as t.OrderState } };
}

export async function cancelOrderByCustomer(orderId: string, sessionId: string) {
  const rows = await db().select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order || order.sessionId !== sessionId) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
  assertOrderTransition({ from: order.state, to: "CANCELLED", actor: "customer", placedAt: order.placedAt, now: Date.now() });
  await db().update(t.orders).set({ state: "CANCELLED" }).where(eq(t.orders.id, orderId));
  await db().update(t.orderItems).set({ state: "CANCELLED", cancelledReason: "Customer cancelled" }).where(eq(t.orderItems.orderId, orderId));
  return { order: { ...order, state: "CANCELLED" as t.OrderState } };
}

export async function cancelItemByCustomer(itemId: string, sessionId: string) {
  const rows = await db()
    .select({ item: t.orderItems, order: t.orders })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .where(eq(t.orderItems.id, itemId))
    .limit(1);
  const row = rows[0];
  if (!row || row.order.sessionId !== sessionId) throw new DomainError("NOT_FOUND", "Item mila nahi.", 404);
  if (row.item.state !== "QUEUED") throw new DomainError("ILLEGAL_TRANSITION", "Kitchen ne is dish ko haath laga diya — ab cancel nahi hoga.");
  assertOrderTransition({ from: row.order.state, to: "CANCELLED", actor: "customer", placedAt: row.order.placedAt, now: Date.now() });
  await db().update(t.orderItems).set({ state: "CANCELLED", cancelledReason: "Customer cancelled" }).where(eq(t.orderItems.id, itemId));
  const remaining = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.orderItems)
    .where(and(eq(t.orderItems.orderId, row.order.id), eq(t.orderItems.state, "QUEUED")));
  return { cancelled: true, remainingQueued: Number(remaining[0]?.n ?? 0) };
}

export async function serveOrder(orderId: string, staffId: string) {
  const now = Date.now();
  const row = (await db().select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1))[0];
  if (!row) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
  const items = await db().select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId));
  const outstanding = items.filter((i) => i.state !== "CANCELLED" && i.state !== "SERVED");
  if (outstanding.some((i) => i.state !== "READY")) {
    throw new DomainError("ILLEGAL_TRANSITION", "Sab items ready nahi hain — jo ready hai woh pehle serve karein.");
  }
  assertOrderTransition({ from: row.state, to: "SERVED", actor: "staff", placedAt: row.placedAt, now });
  await db().update(t.orderItems).set({ state: "SERVED", servedAt: now }).where(and(eq(t.orderItems.orderId, orderId), eq(t.orderItems.state, "READY")));
  await db().update(t.orders).set({ state: "SERVED", servedAt: now, staffId }).where(eq(t.orders.id, orderId));
  return { ok: true };
}

export async function serveItem(itemId: string, staffId: string) {
  void staffId;
  const now = Date.now();
  const row = (await db().select().from(t.orderItems).where(eq(t.orderItems.id, itemId)).limit(1))[0];
  if (!row) throw new DomainError("NOT_FOUND", "Item mila nahi.", 404);
  if (row.state !== "READY") throw new DomainError("ILLEGAL_TRANSITION", "Item abhi ready nahi hai.");
  await db().update(t.orderItems).set({ state: "SERVED", servedAt: now }).where(eq(t.orderItems.id, itemId));
  await syncOrderState(row.orderId);
  return { ok: true };
}

/** Recompute the order's state from its items. One place, so kitchen and staff can't drift. */
export async function syncOrderState(orderId: string) {
  const order = (await db().select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1))[0];
  if (!order) return;
  if (["PAID", "BILLED", "CANCELLED", "REJECTED", "SERVED"].includes(order.state)) return;
  const items = await db().select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId));
  const live = items.filter((i) => i.state !== "CANCELLED");
  if (live.length === 0) return;
  const now = Date.now();
  const allReady = live.every((i) => i.state === "READY" || i.state === "SERVED");
  const anyStarted = live.some((i) => i.state !== "QUEUED");

  if (live.every((i) => i.state === "SERVED")) {
    if (order.state !== "SERVED") await db().update(t.orders).set({ state: "SERVED", servedAt: now }).where(eq(t.orders.id, orderId));
    return;
  }
  if (allReady && order.state !== "READY") {
    await db().update(t.orders).set({ state: "READY", readyAt: now }).where(eq(t.orders.id, orderId));
    return;
  }
  if (anyStarted && (order.state === "IN_KITCHEN" || order.state === "ACCEPTED")) {
    await db().update(t.orders).set({ state: "PREPARING" }).where(eq(t.orders.id, orderId));
  }
}

export async function markOrderInKitchen(orderId: string, actor: Actor) {
  const row = (await db().select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1))[0];
  if (!row) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
  assertOrderTransition({ from: row.state, to: "IN_KITCHEN", actor, placedAt: row.placedAt, now: Date.now() });
  await db().update(t.orders).set({ state: "IN_KITCHEN" }).where(eq(t.orders.id, orderId));
}

export async function tableReady(tableId: string, staffId: string) {
  const row = (await db().select().from(t.tables).where(eq(t.tables.id, tableId)).limit(1))[0];
  if (!row) throw new DomainError("NOT_FOUND", "Table mila nahi.", 404);
  if (row.state !== "CLEANING") throw new DomainError("ILLEGAL_TRANSITION", "Table abhi cleaning mein nahi hai.");
  await db().update(t.tables).set({ state: "FREE", stateSince: Date.now() }).where(eq(t.tables.id, tableId));
  await db().insert(t.auditLog).values({
    id: newId("aud"), outletId: row.outletId, staffId, action: "table.free", entity: "table", entityId: tableId, meta: "{}", createdAt: Date.now(),
  });
}

/** Finds the session a diner device is already part of on an open table, if any. */
export async function findGuestByDevice(sessionId: string, device: string) {
  const rows = await db()
    .select()
    .from(t.guests)
    .where(and(eq(t.guests.sessionId, sessionId), eq(t.guests.deviceHash, device)))
    .limit(1);
  return rows[0] ?? null;
}

export async function openSessionForTable(tableId: string, outletId: string) {
  const existing = await db()
    .select()
    .from(t.sessions)
    .where(and(eq(t.sessions.tableId, tableId), eq(t.sessions.state, "OPEN")))
    .limit(1);
  if (existing[0]) return existing[0];
  const id = newId("ses");
  await db().insert(t.sessions).values({ id, outletId, tableId, state: "OPEN", openedAt: Date.now() });
  return (await db().select().from(t.sessions).where(eq(t.sessions.id, id)).limit(1))[0]!;
}

export async function addGuest(sessionId: string, device: string, name?: string | null) {
  const id = newId("gst");
  await db().insert(t.guests).values({ id, sessionId, name: name?.trim().slice(0, 24) || null, deviceHash: device, joinedAt: Date.now() });
  return (await db().select().from(t.guests).where(eq(t.guests.id, id)).limit(1))[0]!;
}

/** "Phir se wahi order" — the last paid session on this device at this outlet. */
export async function repeatLastOrder(device: string, tableId: string) {
  const previous = await db()
    .select({ sessionId: t.guests.sessionId })
    .from(t.guests)
    .innerJoin(t.sessions, eq(t.sessions.id, t.guests.sessionId))
    .where(and(eq(t.guests.deviceHash, device), eq(t.sessions.state, "CLOSED"), eq(t.sessions.tableId, tableId)))
    .orderBy(sql`${t.sessions.openedAt} DESC`)
    .limit(1);
  if (!previous[0]) return [];
  const items = await db()
    .select({ menuItemId: t.orderItems.menuItemId, name: t.orderItems.nameSnapshot, qty: t.orderItems.qty, notes: t.orderItems.notes })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .where(and(eq(t.orders.sessionId, previous[0].sessionId), eq(t.orderItems.state, "SERVED")));
  return items;
}

export async function countUnacknowledgedCalls() {
  const rows = await db().select({ n: sql<number>`COUNT(*)` }).from(t.waiterCalls).where(isNull(t.waiterCalls.acknowledgedAt));
  return Number(rows[0]?.n ?? 0);
}

export async function getActiveCall(sessionId: string) {
  const rows = await db()
    .select()
    .from(t.waiterCalls)
    .where(and(eq(t.waiterCalls.sessionId, sessionId), isNull(t.waiterCalls.resolvedAt)))
    .orderBy(sql`${t.waiterCalls.createdAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}

export async function createWaiterCall(sessionId: string, tableId: string, reason: t.WaiterCallReason, note?: string | null) {
  const now = Date.now();
  const active = await getActiveCall(sessionId);
  if (active && now - active.createdAt < 90_000) {
    return { call: active, reused: true, secondsLeft: Math.ceil((90_000 - (now - active.createdAt)) / 1000) };
  }
  const id = newId("wcl");
  const call = {
    id, sessionId, tableId, reason, note: note?.slice(0, 120) ?? null,
    createdAt: now, slaDueAt: now + 90_000, acknowledgedAt: null, resolvedAt: null, staffId: null,
  };
  await db().insert(t.waiterCalls).values(call);
  if (reason === "BILL") {
    await db().update(t.tables).set({ state: "BILL_REQUESTED", stateSince: now }).where(eq(t.tables.id, tableId));
  }
  return { call, reused: false, secondsLeft: 0 };
}

export async function resolveCall(callId: string, staffId: string) {
  const now = Date.now();
  const rows = await db().select().from(t.waiterCalls).where(eq(t.waiterCalls.id, callId)).limit(1);
  const call = rows[0];
  if (!call) throw new DomainError("NOT_FOUND", "Call mila nahi.", 404);
  await db()
    .update(t.waiterCalls)
    .set({ acknowledgedAt: call.acknowledgedAt ?? now, resolvedAt: now, staffId })
    .where(eq(t.waiterCalls.id, callId));
  return { ok: true };
}

export async function acknowledgeCall(callId: string, staffId: string) {
  const now = Date.now();
  await db().update(t.waiterCalls).set({ acknowledgedAt: now, staffId }).where(eq(t.waiterCalls.id, callId));
  return { ok: true };
}
