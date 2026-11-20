import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { getFloor } from "@/lib/db/queries";
import type { StaffSession } from "@/lib/auth/session";

export type QueueTask = {
  id: string;
  kind: "ORDER_ACCEPT" | "WAITER_CALL" | "BILL_REQUEST" | "READY_TO_SERVE" | "OVERDUE_KITCHEN";
  tableId: string;
  tableNumber: string;
  section: string;
  title: string;
  detail: string;
  createdAt: number;
  slaDueAt: number | null;
  orderId?: string;
  callId?: string;
  amountPaise?: number;
};

/** One poll paints the whole floor: tasks sorted by SLA pressure, tables with their running totals. */
export async function floorPayload(staff: StaffSession, filterSection = true) {
  const { tables, calls, sections } = await getFloor();
  const activeSection = filterSection && staff.section ? staff.section : null;
  const scoped = activeSection ? tables.filter((row) => row.table.section === activeSection) : tables;
  const tasks: QueueTask[] = [];

  for (const row of scoped) {
    const { table, openOrders, guests } = row;
    for (const order of openOrders) {
      if (order.state === "PLACED") {
        tasks.push({
          id: `accept-${order.id}`,
          kind: "ORDER_ACCEPT",
          tableId: table.id,
          tableNumber: table.number,
          section: table.section,
          title: `Accept order #${order.number}`,
          detail: `${rupeeShort(order.totalPaise)} · ${guests[0]?.name ?? "guest"} · ${durationShort(Date.now() - order.placedAt)} ago`,
          createdAt: order.placedAt,
          slaDueAt: order.placedAt + 60_000,
          orderId: order.id,
          amountPaise: order.totalPaise,
        });
      }
      if (order.state === "READY") {
        tasks.push({
          id: `serve-${order.id}`,
          kind: "READY_TO_SERVE",
          tableId: table.id,
          tableNumber: table.number,
          section: table.section,
          title: `Order #${order.number} ready to serve`,
          detail: `Ready ${durationShort(Date.now() - (order.readyAt ?? Date.now()))} pehle`,
          createdAt: order.readyAt ?? order.placedAt,
          slaDueAt: (order.readyAt ?? order.placedAt) + 120_000,
          orderId: order.id,
        });
      }
    }
  }

  for (const call of calls) {
    const table = tables.find((r) => r.table.id === call.tableId)?.table;
    if (!table) continue;
    if (activeSection && table.section !== activeSection) continue;
    const isBill = call.reason === "BILL";
    tasks.push({
      id: `call-${call.id}`,
      kind: isBill ? "BILL_REQUEST" : "WAITER_CALL",
      tableId: table.id,
      tableNumber: table.number,
      section: table.section,
      title: isBill ? "Bill maanga hai" : callTitle(call.reason),
      detail: call.note ? `“${call.note}”` : `${durationShort(Date.now() - call.createdAt)} pehle`,
      createdAt: call.createdAt,
      slaDueAt: call.slaDueAt,
      callId: call.id,
    });
  }

  // kitchen-side pressure, surfaced on the floor so nobody has to yell
  const overdue = await db()
    .select({ orderId: t.orderItems.orderId, at: sql<number>`MIN(${t.orderItems.startedAt})` })
    .from(t.orderItems)
    .where(and(eq(t.orderItems.state, "PREPARING"), sql`${t.orderItems.startedAt} IS NOT NULL`))
    .groupBy(t.orderItems.orderId);
  for (const row of overdue) {
    const rowItems = await db().select().from(t.orderItems).where(eq(t.orderItems.orderId, row.orderId));
    const late = rowItems.filter(
      (i) => i.state === "PREPARING" && i.startedAt && Date.now() - i.startedAt > (i.prepMinutes + 8) * 60_000,
    );
    if (late.length === 0) continue;
    const orderRow = (await db().select().from(t.orders).where(eq(t.orders.id, row.orderId)).limit(1))[0];
    if (!orderRow) continue;
    const table = tables.find((r) => r.table.id === orderRow.tableId)?.table;
    if (!table) continue;
    if (activeSection && table.section !== activeSection) continue;
    tasks.push({
      id: `overdue-${row.orderId}`,
      kind: "OVERDUE_KITCHEN",
      tableId: table.id,
      tableNumber: table.number,
      section: table.section,
      title: `#${orderRow.number} kitchen mein atka hai`,
      detail: `${late[0]!.nameSnapshot} ${durationShort(Date.now() - Number(late[0]!.startedAt))} se ban raha hai`,
      createdAt: Number(late[0]!.startedAt),
      slaDueAt: null,
      orderId: orderRow.id,
    });
  }

  const rank: Record<QueueTask["kind"], number> = { BILL_REQUEST: 0, WAITER_CALL: 1, ORDER_ACCEPT: 2, READY_TO_SERVE: 3, OVERDUE_KITCHEN: 4 };
  tasks.sort((a, b) => {
    const aOver = a.slaDueAt ? a.slaDueAt - Date.now() : Number.MAX_SAFE_INTEGER;
    const bOver = b.slaDueAt ? b.slaDueAt - Date.now() : Number.MAX_SAFE_INTEGER;
    if (Math.sign(aOver) !== Math.sign(bOver)) return aOver < bOver ? -1 : 1;
    if (aOver !== bOver) return aOver - bOver;
    return rank[a.kind] - rank[b.kind];
  });

  const breached = tasks.filter((t) => t.slaDueAt && Date.now() > t.slaDueAt).length;
  const managerAlert = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(t.reviews)
    .where(and(isNull(t.reviews.resolvedAt), sql`${t.reviews.rating} <= 2`, sql`${t.reviews.managerAlertAt} > ${Date.now() - 30 * 60_000}`));

  return {
    serverNow: Date.now(),
    staff: { id: staff.staffId, name: staff.name, role: staff.role, section: staff.section },
    tasks,
    tables: scoped.map((row) => ({
      id: row.table.id,
      number: row.table.number,
      section: row.table.section,
      seats: row.table.seats,
      state: row.table.state,
      stateSince: row.table.stateSince,
      guests: row.guests.map((g) => ({ id: g.id, name: g.name })),
      sessionId: row.session?.id ?? null,
      runningSubtotalPaise: row.runningSubtotal,
      oldestActiveAt: row.oldestActiveAt,
      openOrderCount: row.openOrders.length,
    })),
    sections,
    activeSection: staff.section,
    stats: {
      breached,
      openCalls: calls.length,
      openOrders: tasks.filter((t) => t.kind === "ORDER_ACCEPT").length,
      vipManagerAlert: Number(managerAlert[0]?.n ?? 0) > 0,
    },
  };
}

export async function managerAlertText(): Promise<string | null> {
  const rows = await db()
    .select()
    .from(t.reviews)
    .where(and(isNull(t.reviews.resolvedAt), sql`${t.reviews.rating} <= 2`))
    .orderBy(sql`${t.reviews.createdAt} DESC`)
    .limit(1);
  const review = rows[0];
  if (!review) return null;
  const table = (await db().select().from(t.sessions).where(eq(t.sessions.id, review.sessionId)).limit(1))[0];
  if (!table) return `A ${review.rating}★ review aaya hai — inbox check karein.`;
  const tableRow = (await db().select().from(t.tables).where(eq(t.tables.id, table.tableId)).limit(1))[0];
  return `${tableRow?.number ?? "Table"} se ${review.rating}★ review — ${durationShort(Date.now() - review.createdAt)} pehle. Manager ko jaana chahiye.`;
}

export async function forceManagerAlertsVisible() {
  const rows = await db()
    .select({ id: t.reviews.id })
    .from(t.reviews)
    .where(and(isNull(t.reviews.resolvedAt), sql`${t.reviews.rating} <= 2`));
  return rows.length;
}

function rupeeShort(paise: number) {
  const r = Math.round(paise / 100);
  return `₹${r.toLocaleString("en-IN")}`;
}

function durationShort(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function callTitle(reason: t.WaiterCallReason) {
  const map: Record<t.WaiterCallReason, string> = {
    BILL: "Bill maanga hai",
    WATER: "Paani chahiye",
    PLATE: "Extra plate chahiye",
    CLEAN: "Table saaf karni hai",
    ASSIST: "Baby chair chahiye",
    OTHER: "Kuch chahiye",
  };
  return map[reason];
}
