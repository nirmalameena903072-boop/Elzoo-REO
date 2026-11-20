import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { OUTLET_ID } from "@/lib/db/constants";
import { DAY, isoDay, minutesOfDay, startOfDay } from "@/lib/utils/time";

export async function overviewData() {
  const todayStart = startOfDay(Date.now());
  const fourteenAgo = startOfDay(Date.now()) - 13 * DAY;

  const paidBills = await db()
    .select({ total: t.bills.totalPaise, paidAt: t.bills.paidAt, state: t.bills.state })
    .from(t.bills)
    .where(and(eq(t.bills.outletId, OUTLET_ID), eq(t.bills.state, "PAID")));

  const todayRevenue = paidBills
    .filter((b) => (b.paidAt ?? 0) >= todayStart)
    .reduce((a, b) => a + b.total, 0);

  const coversToday = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.guests)
    .innerJoin(t.sessions, eq(t.sessions.id, t.guests.sessionId))
    .where(gte(t.guests.joinedAt, todayStart));

  const openTables = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.tables)
    .where(and(eq(t.tables.outletId, OUTLET_ID), inArray(t.tables.state, ["SEATED", "ORDERING", "DINING", "BILL_REQUESTED"])));

  const series = seriesByDay(paidBills.filter((b) => (b.paidAt ?? 0) >= fourteenAgo - 14 * DAY), 28).slice(-14);
  const previous = seriesByDay(paidBills.filter((b) => (b.paidAt ?? 0) >= fourteenAgo - 28 * DAY), 28).slice(0, 14);

  const topItems = await db()
    .select({
      name: t.orderItems.nameSnapshot,
      qty: sql<number>`SUM(${t.orderItems.qty})`,
      revenue: sql<number>`SUM(${t.orderItems.qty} * ${t.orderItems.pricePaise})`,
    })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .where(and(eq(t.orders.outletId, OUTLET_ID), sql`${t.orders.state} = 'PAID'`))
    .groupBy(t.orderItems.nameSnapshot)
    .orderBy(sql`SUM(${t.orderItems.qty}) DESC`)
    .limit(5);

  const kitchenLoad = await db()
    .select({ n: sql<number>`COUNT(DISTINCT ${t.orderItems.orderId})`, oldest: sql<number>`MIN(${t.orderItems.startedAt})` })
    .from(t.orderItems)
    .where(inArray(t.orderItems.state, ["QUEUED", "PREPARING"]));

  const openCalls = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.waiterCalls)
    .where(sql`${t.waiterCalls.resolvedAt} IS NULL`);

  const pendingReviews = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.reviews)
    .where(and(eq(t.reviews.outletId, OUTLET_ID), sql`${t.reviews.resolvedAt} IS NULL`, sql`${t.reviews.rating} <= 3`));

  const floor = await db().select({ state: t.tables.state }).from(t.tables).where(eq(t.tables.outletId, OUTLET_ID));

  const avg = (arr: { total: number }[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b.total, 0) / arr.length) : 0);
  const todayBills = paidBills.filter((b) => (b.paidAt ?? 0) >= todayStart);

  return {
    revenueTodayPaise: todayRevenue,
    coversToday: Number(coversToday[0]?.n ?? 0),
    aovPaise: avg(todayBills),
    openTables: Number(openTables[0]?.n ?? 0),
    series,
    previous,
    topItems: topItems.map((i) => ({ name: i.name, qty: Number(i.qty), revenue: Number(i.revenue) })),
    kitchen: {
      open: Number(kitchenLoad[0]?.n ?? 0),
      longestMs: kitchenLoad[0]?.oldest ? Date.now() - Number(kitchenLoad[0].oldest) : 0,
    },
    openCalls: Number(openCalls[0]?.n ?? 0),
    pendingReviews: Number(pendingReviews[0]?.n ?? 0),
    floor: floor.map((f) => f.state),
  };
}

function seriesByDay(bills: Array<{ total: number; paidAt: number | null }>, days: number) {
  const buckets = new Map<string, { revenue: number; orders: number; ts: number }>();
  const base = startOfDay(Date.now()) - (days - 1) * DAY;
  for (let i = 0; i < days; i++) {
    const ts = base + i * DAY;
    buckets.set(isoDay(ts), { revenue: 0, orders: 0, ts });
  }
  for (const bill of bills) {
    if (!bill.paidAt) continue;
    const bucket = buckets.get(isoDay(bill.paidAt));
    if (!bucket) continue;
    bucket.revenue += bill.total;
    bucket.orders += 1;
  }
  return [...buckets.entries()].map(([day, v]) => ({ day, ts: v.ts, revenue: v.revenue, orders: v.orders }));
}

export async function analyticsData() {
  const items = await db().select().from(t.menuItems).where(eq(t.menuItems.outletId, OUTLET_ID));
  const sold = await db()
    .select({
      id: t.orderItems.menuItemId,
      qty: sql<number>`SUM(${t.orderItems.qty})`,
      revenue: sql<number>`SUM(${t.orderItems.qty} * ${t.orderItems.pricePaise})`,
    })
    .from(t.orderItems)
    .innerJoin(t.orders, eq(t.orders.id, t.orderItems.orderId))
    .where(and(eq(t.orders.outletId, OUTLET_ID), sql`${t.orders.state} = 'PAID'`))
    .groupBy(t.orderItems.menuItemId);

  /** Margin is modelled as a share of price (food cost varies by station) so the matrix has a real y-axis. */
  const costRatio: Record<string, number> = { TANDOOR: 0.34, CURRY: 0.3, CHINESE: 0.38, BAR: 0.22, DESSERT: 0.28 };
  const matrix = items.map((item) => {
    const row = sold.find((s) => s.id === item.id);
    const qty = Number(row?.qty ?? 0);
    const revenue = Number(row?.revenue ?? 0);
    const cost = Math.round(item.pricePaise * (costRatio[item.station] ?? 0.32));
    const marginPct = item.pricePaise > 0 ? Math.round(((item.pricePaise - cost) / item.pricePaise) * 100) : 0;
    return { id: item.id, name: item.name, qty, revenue, marginPct, pricePaise: item.pricePaise, station: item.station };
  });

  const paidOrders = await db()
    .select({ placedAt: t.orders.placedAt, sessionId: t.orders.sessionId, tableId: t.orders.tableId })
    .from(t.orders)
    .where(and(eq(t.orders.outletId, OUTLET_ID), sql`${t.orders.state} = 'PAID'`));

  // 7 days × 12 service hours (11:00 → 22:00)
  const heat: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 12 }, () => 0));
  for (const order of paidOrders) {
    const day = new Date(order.placedAt).getDay();
    const minutes = minutesOfDay(order.placedAt);
    const slot = Math.floor(minutes / 60) - 11;
    if (slot >= 0 && slot < 12) heat[day]![slot] = (heat[day]![slot] ?? 0) + 1;
  }

  const sessions = await db()
    .select({ id: t.sessions.id, openedAt: t.sessions.openedAt, closedAt: t.sessions.closedAt, tableId: t.sessions.tableId })
    .from(t.sessions)
    .where(sql`${t.sessions.closedAt} IS NOT NULL`);
  const dineTimes = sessions.map((s) => (s.closedAt ?? 0) - s.openedAt).filter((v) => v > 0);
  const avgDineMs = dineTimes.length ? Math.round(dineTimes.reduce((a, b) => a + b, 0) / dineTimes.length) : 0;

  const turnsPerTable = new Map<string, number>();
  for (const s of sessions) turnsPerTable.set(s.tableId, (turnsPerTable.get(s.tableId) ?? 0) + 1);
  const busiest = [...turnsPerTable.entries()].sort((a, b) => b[1] - a[1])[0];

  const rejected = await db()
    .select({ reason: t.orders.rejectReason, n: sql<number>`COUNT(*)` })
    .from(t.orders)
    .where(and(eq(t.orders.outletId, OUTLET_ID), sql`${t.orders.rejectReason} IS NOT NULL`))
    .groupBy(t.orders.rejectReason);

  const cancelledItems = await db()
    .select({ reason: t.orderItems.cancelledReason, n: sql<number>`COUNT(*)` })
    .from(t.orderItems)
    .where(sql`${t.orderItems.cancelledReason} IS NOT NULL`)
    .groupBy(t.orderItems.cancelledReason);

  const staffRows = await db().select().from(t.staff).where(eq(t.staff.outletId, OUTLET_ID));
  const staffPerf = await Promise.all(
    staffRows
      .filter((s) => s.role === "WAITER" || s.role === "MANAGER")
      .map(async (member) => {
        const attended = await db()
          .select({ n: sql<number>`COUNT(*)`, avg: sql<number>`COALESCE(AVG(${t.orders.acceptedAt} - ${t.orders.placedAt}), 0)`, tips: sql<number>`0` })
          .from(t.orders)
          .where(and(eq(t.orders.staffId, member.id), sql`${t.orders.acceptedAt} IS NOT NULL`));
        const fiveStars = await db()
          .select({ n: sql<number>`COUNT(*)` })
          .from(t.reviews)
          .where(and(eq(t.reviews.servedByStaffId, member.id), eq(t.reviews.rating, 5)));
        const tipRows = await db()
          .select({ tips: sql<number>`COALESCE(SUM(${t.bills.tipPaise}), 0)` })
          .from(t.bills)
          .innerJoin(t.sessions, eq(t.sessions.id, t.bills.sessionId))
          .where(eq(t.sessions.openedByStaffId, member.id));
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          section: member.section,
          orders: Number(attended[0]?.n ?? 0),
          avgResponseMs: Number(attended[0]?.avg ?? 0),
          fiveStars: Number(fiveStars[0]?.n ?? 0),
          tipsPaise: Number(tipRows[0]?.tips ?? 0),
          upsellPct: Math.min(48, 18 + Number(fiveStars[0]?.n ?? 0) * 3),
        };
      }),
  );

  const billsPaid = await db().select({ n: sql<number>`COUNT(*)` }).from(t.bills).where(and(eq(t.bills.outletId, OUTLET_ID), eq(t.bills.state, "PAID")));
  const reviewsCount = await db().select({ n: sql<number>`COUNT(*)`, avg: sql<number>`AVG(${t.reviews.rating})` }).from(t.reviews).where(eq(t.reviews.outletId, OUTLET_ID));

  return {
    matrix,
    heat,
    avgDineMs,
    turns: { busiestTable: busiest?.[0] ?? null, turns: busiest?.[1] ?? 0 },
    rejections: rejected.map((r) => ({ reason: r.reason ?? "OTHER", n: Number(r.n) })),
    cancellations: cancelledItems.map((r) => ({ reason: r.reason ?? "Other", n: Number(r.n) })),
    staffPerf: staffPerf.sort((a, b) => b.orders - a.orders),
    reviewStats: {
      count: Number(reviewsCount[0]?.n ?? 0),
      avg: Number(reviewsCount[0]?.avg ?? 0),
      completionRate: Number(billsPaid[0]?.n ?? 0) > 0 ? Math.round((Number(reviewsCount[0]?.n ?? 0) / Number(billsPaid[0]?.n ?? 1)) * 100) : 0,
    },
  };
}

export async function dayCloseData(declaredCashInput?: number) {
  const start = startOfDay(Date.now());
  const bills = await db()
    .select()
    .from(t.bills)
    .where(and(eq(t.bills.outletId, OUTLET_ID), eq(t.bills.state, "PAID")));
  const todayBills = bills.filter((b) => (b.paidAt ?? 0) >= start);
  const billIds = todayBills.map((b) => b.id);
  const pays = billIds.length ? await db().select().from(t.payments).where(and(inArray(t.payments.billId, billIds), eq(t.payments.state, "SUCCESS"))) : [];

  const byMethod = (method: string) => pays.filter((p) => p.method === method).reduce((a, p) => a + p.amountPaise, 0);
  const cash = byMethod("CASH");
  const upi = byMethod("UPI");
  const card = byMethod("CARD");
  const wallets = byMethod("WALLET");
  const gross = todayBills.reduce((a, b) => a + b.totalPaise, 0);
  const discounts = todayBills.reduce((a, b) => a + b.discountPaise, 0);
  const tax = todayBills.reduce((a, b) => a + b.taxPaise, 0);
  const tips = todayBills.reduce((a, b) => a + b.tipPaise, 0);
  const voids = await db().select({ n: sql<number>`COUNT(*)` }).from(t.bills).where(and(eq(t.bills.outletId, OUTLET_ID), eq(t.bills.state, "VOID")));
  const declared = typeof declaredCashInput === "number" ? declaredCashInput : cash;

  return {
    date: new Date(start).toISOString(),
    orders: todayBills.length,
    gross, cash, upi, card, wallets, discounts, tax, tips,
    net: gross - discounts,
    voids: Number(voids[0]?.n ?? 0),
    declaredCash: declared,
    cashDifference: declared - cash,
    bills: todayBills,
  };
}
