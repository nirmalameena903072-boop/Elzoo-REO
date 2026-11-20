import { and, desc, eq, inArray, isNull, ne, sql, asc } from "drizzle-orm";
import { db } from "./index";
import * as t from "./schema";
import { OUTLET_ID } from "./constants";

export type TableWithSession = {
  table: t.Table;
  session: t.Session | null;
  guests: t.Guest[];
  openOrders: t.Order[];
  runningSubtotal: number;
  oldestActiveAt: number | null;
};

export async function getOutlet() {
  const rows = await db().select().from(t.outlets).where(eq(t.outlets.id, OUTLET_ID)).limit(1);
  return rows[0] ?? null;
}

export async function getTableByNumber(number: string) {
  const rows = await db().select().from(t.tables).where(and(eq(t.tables.outletId, OUTLET_ID), eq(t.tables.number, number))).limit(1);
  return rows[0] ?? null;
}

export async function getTableById(id: string) {
  const rows = await db().select().from(t.tables).where(eq(t.tables.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getOpenSession(tableId: string) {
  const rows = await db()
    .select()
    .from(t.sessions)
    .where(and(eq(t.sessions.tableId, tableId), inArray(t.sessions.state, ["OPEN", "BILLED"])))
    .orderBy(desc(t.sessions.openedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSessionGuests(sessionId: string) {
  return db().select().from(t.guests).where(eq(t.guests.sessionId, sessionId)).orderBy(asc(t.guests.joinedAt));
}

export async function getSessionOrders(sessionId: string) {
  return db()
    .select()
    .from(t.orders)
    .where(eq(t.orders.sessionId, sessionId))
    .orderBy(asc(t.orders.placedAt));
}

export async function getSessionRunningTotal(sessionId: string) {
  const rows = await db()
    .select({ total: sql<number>`COALESCE(SUM(${t.orderItems.pricePaise} * ${t.orderItems.qty}), 0)` })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .where(and(eq(t.orders.sessionId, sessionId), ne(t.orderItems.state, "CANCELLED"), ne(t.orders.state, "CANCELLED"), ne(t.orders.state, "REJECTED")));
  return Number(rows[0]?.total ?? 0);
}

export async function getFloor(): Promise<{ tables: TableWithSession[]; calls: t.WaiterCall[]; sections: string[] }> {
  const floor = await db().select().from(t.tables).where(eq(t.tables.outletId, OUTLET_ID)).orderBy(asc(t.tables.number));
  const openSessions = await db()
    .select()
    .from(t.sessions)
    .where(inArray(t.sessions.state, ["OPEN", "BILLED"]))
    .orderBy(asc(t.sessions.openedAt));

  const sessionIds = openSessions.map((s) => s.id);
  const orders = sessionIds.length
    ? await db()
        .select()
        .from(t.orders)
        .where(and(inArray(t.orders.sessionId, sessionIds), ne(t.orders.state, "PAID"), ne(t.orders.state, "CANCELLED"), ne(t.orders.state, "REJECTED")))
        .orderBy(asc(t.orders.placedAt))
    : [];
  const guests = sessionIds.length ? await db().select().from(t.guests).where(inArray(t.guests.sessionId, sessionIds)) : [];
  const subtotals = sessionIds.length
    ? await db()
        .select({ sessionId: t.orders.sessionId, total: sql<number>`COALESCE(SUM(${t.orderItems.pricePaise} * ${t.orderItems.qty}), 0)` })
        .from(t.orderItems)
        .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
        .where(inArray(t.orders.sessionId, sessionIds))
        .groupBy(t.orders.sessionId)
    : [];

  const calls = await db()
    .select()
    .from(t.waiterCalls)
    .where(isNull(t.waiterCalls.resolvedAt))
    .orderBy(asc(t.waiterCalls.createdAt));

  const rows: TableWithSession[] = floor.map((table) => {
    const session = openSessions.find((s) => s.tableId === table.id) ?? null;
    const tableOrders = session ? orders.filter((o) => o.sessionId === session.id) : [];
    const activeBits = [session?.openedAt, ...tableOrders.map((o) => o.placedAt)].filter((v): v is number => typeof v === "number");
    return {
      table,
      session,
      guests: session ? guests.filter((g) => g.sessionId === session.id) : [],
      openOrders: tableOrders,
      runningSubtotal: Number(subtotals.find((s) => s.sessionId === session?.id)?.total ?? 0),
      oldestActiveAt: activeBits.length ? Math.min(...activeBits) : null,
    };
  });

  const sections = [...new Set(floor.map((f) => f.section))].sort();
  return { tables: rows, calls, sections };
}

export async function getMenu() {
  const [categories, items] = await Promise.all([
    db().select().from(t.menuCategories).where(and(eq(t.menuCategories.outletId, OUTLET_ID), eq(t.menuCategories.active, true))).orderBy(asc(t.menuCategories.sort)),
    db().select().from(t.menuItems).where(eq(t.menuItems.outletId, OUTLET_ID)).orderBy(asc(t.menuItems.sort)),
  ]);
  return { categories, items };
}

export async function getOrderWithItems(orderId: string) {
  const rows = await db().select().from(t.orders).where(eq(t.orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return null;
  const items = await db().select().from(t.orderItems).where(eq(t.orderItems.orderId, orderId)).orderBy(asc(t.orderItems.id));
  const table = await getTableById(order.tableId);
  return { order, items, table };
}

export async function getSessionWithOrders(sessionId: string) {
  const rows = await db().select().from(t.sessions).where(eq(t.sessions.id, sessionId)).limit(1);
  const session = rows[0];
  if (!session) return null;
  const orders = await getSessionOrders(sessionId);
  const items = orders.length
    ? await db().select().from(t.orderItems).where(inArray(t.orderItems.orderId, orders.map((o) => o.id)))
    : [];
  const table = await getTableById(session.tableId);
  const guests = await getSessionGuests(sessionId);
  return { session, orders, items, table, guests };
}

export async function getBillForSession(sessionId: string) {
  const rows = await db()
    .select()
    .from(t.bills)
    .where(eq(t.bills.sessionId, sessionId))
    .orderBy(desc(t.bills.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getBillDetail(billId: string) {
  const rows = await db().select().from(t.bills).where(eq(t.bills.id, billId)).limit(1);
  const bill = rows[0];
  if (!bill) return null;
  const [splits, payments, sessionRow] = await Promise.all([
    db().select().from(t.billSplits).where(eq(t.billSplits.billId, billId)),
    db().select().from(t.payments).where(eq(t.payments.billId, billId)).orderBy(asc(t.payments.createdAt)),
    db().select().from(t.sessions).where(eq(t.sessions.id, bill.sessionId)).limit(1),
  ]);
  const session = sessionRow[0] ?? null;
  const sessionDetail = await getSessionWithOrders(bill.sessionId);
  return { bill, splits, payments, session, detail: sessionDetail };
}

export async function getKitchenBoard() {
  const rows = await db()
    .select({
      item: t.orderItems,
      order: t.orders,
      table: t.tables,
      guest: t.guests,
    })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .innerJoin(t.tables, eq(t.tables.id, t.orders.tableId))
    .leftJoin(t.guests, eq(t.guests.id, t.orderItems.guestId))
    .where(inArray(t.orderItems.state, ["QUEUED", "PREPARING", "READY"]))
    .orderBy(asc(t.orderItems.id));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const finished = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.orderItems)
    .where(and(eq(t.orderItems.state, "SERVED"), sql`${t.orderItems.servedAt} >= ${today.getTime()}`));

  const avgMs = await db()
    .select({ avg: sql<number>`COALESCE(AVG(${t.orders.servedAt} - ${t.orders.acceptedAt}), 0)` })
    .from(t.orders)
    .where(and(eq(t.orders.state, "SERVED"), sql`${t.orders.servedAt} >= ${today.getTime()}`));

  return {
    tickets: rows.filter((r) => r.order.state !== "CANCELLED" && r.order.state !== "REJECTED"),
    coversToday: Number(finished[0]?.n ?? 0),
    avgTicketMs: Number(avgMs[0]?.avg ?? 0),
  };
}

export async function getMenuAvailability() {
  const rows = await db().select().from(t.menuItems).where(eq(t.menuItems.outletId, OUTLET_ID)).orderBy(asc(t.menuItems.sort));
  return rows;
}

export async function getUnresolvedReviews() {
  return db()
    .select()
    .from(t.reviews)
    .where(and(eq(t.reviews.outletId, OUTLET_ID), isNull(t.reviews.resolvedAt), sql`${t.reviews.rating} <= 3`))
    .orderBy(desc(t.reviews.createdAt));
}

export async function getAllReviews() {
  return db().select().from(t.reviews).where(eq(t.reviews.outletId, OUTLET_ID)).orderBy(desc(t.reviews.createdAt));
}

export async function getReviewBySession(sessionId: string) {
  const rows = await db().select().from(t.reviews).where(eq(t.reviews.sessionId, sessionId)).limit(1);
  return rows[0] ?? null;
}

export async function nextOrderNumber(): Promise<number> {
  const rows = await db().select({ max: sql<number>`COALESCE(MAX(${t.orders.number}), 1000)` }).from(t.orders);
  return Number(rows[0]?.max ?? 1000) + 1;
}

export async function nextBillNumber(): Promise<string> {
  const rows = await db().select({ max: sql<number>`COUNT(*)` }).from(t.bills);
  return `INV-${700 + Number(rows[0]?.max ?? 0)}`;
}

export async function nextKotNumber(): Promise<number> {
  const rows = await db().select({ max: sql<number>`COALESCE(MAX(${t.kotTickets.number}), 300)` }).from(t.kotTickets);
  return Number(rows[0]?.max ?? 300) + 1;
}
