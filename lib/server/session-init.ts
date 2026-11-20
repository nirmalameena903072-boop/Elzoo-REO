import { cookies } from "next/headers";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getOutlet, getTableByNumber, getOpenSession, getSessionGuests } from "@/lib/db/queries";
import { addGuest, findGuestByDevice, openSessionForTable } from "@/lib/domain/orders";
import { deviceHash } from "@/lib/utils/ids";
import { DomainError } from "@/lib/domain/errors";

export type DinerContext = {
  outlet: t.Outlet;
  table: t.Table;
  session: t.Session;
  guest: t.Guest;
  guests: t.Guest[];
  returning: boolean;
};

/** How long a settled table stays "theirs" so the guest can still reach bill and review. */
const AFTER_PAY_WINDOW_MS = 90 * 60 * 1000;

async function latestSessionForTable(tableId: string) {
  const rows = await db().select().from(t.sessions).where(eq(t.sessions.tableId, tableId)).orderBy(desc(t.sessions.openedAt)).limit(1);
  return rows[0] ?? null;
}

/**
 * A table that just settled must not sprout a brand-new session the moment the guest
 * taps "review" — otherwise their bill and their review belong to a session that never
 * existed. Recently settled sessions stay reachable for a window; after that, a new party
 * at the table legitimately starts over.
 *
 * Ownership is intentionally not required: whoever is holding this table's token is sitting
 * at this table, and the window plus the signed table token is the real gate. A friend paying
 * their share on their own phone must reach the same bill.
 */
async function recentSettledSession(tableId: string) {
  const latest = await latestSessionForTable(tableId);
  if (!latest) return null;
  if (latest.state !== "PAID" && latest.state !== "CLOSED") return null;
  const closedAt = latest.closedAt ?? latest.openedAt;
  return Date.now() - closedAt > AFTER_PAY_WINDOW_MS ? null : latest;
}

/**
 * Find-or-create what this device should see at a table: the live session if one is open,
 * otherwise the session that just settled, otherwise a fresh one.
 */
export async function resolveDiner(tableNumber: string, deviceId: string): Promise<DinerContext> {
  const outlet = await getOutlet();
  if (!outlet) throw new DomainError("NOT_FOUND", "Outlet seed nahi hua — /api/health dekhein.", 500);
  const table = await getTableByNumber(tableNumber);
  if (!table) throw new DomainError("NOT_FOUND", "Table mila nahi.", 404);
  const hash = deviceHash(deviceId);

  const session = (await getOpenSession(table.id)) ?? (await recentSettledSession(table.id));
  if (session) {
    const existing = await findGuestByDevice(session.id, hash);
    const guest = existing ?? (await addGuest(session.id, hash));
    if (session.state === "OPEN" && (table.state === "FREE" || table.state === "CLEANING")) {
      await db().update(t.tables).set({ state: "SEATED", stateSince: Date.now() }).where(eq(t.tables.id, table.id));
    }
    const fresh = await getTableByNumber(tableNumber);
    return { outlet, table: fresh ?? table, session, guest, guests: await getSessionGuests(session.id), returning: !!existing };
  }

  const opened = await openSessionForTable(table.id, outlet.id);
  const guest = await addGuest(opened.id, hash);
  await db().update(t.tables).set({ state: "SEATED", stateSince: Date.now() }).where(eq(t.tables.id, table.id));
  const fresh = await getTableByNumber(tableNumber);
  return { outlet, table: fresh ?? table, session: opened, guest, guests: await getSessionGuests(opened.id), returning: false };
}

/**
 * Guest cookie: one per browser, never an auth token.
 * Minted by middleware on first request; a request without it falls back to a per-request id
 * so a page render can never throw on a read-only cookie store.
 */
export async function deviceIdForRequest(): Promise<string> {
  const jar = await cookies();
  return jar.get("volud_guest")?.value ?? "anon-device";
}

/** Bill and review read the same context as the menu; the name documents intent at those call sites. */
export const resolveSettledOrDiner = resolveDiner;

export async function isMultiGuest(sessionId: string) {
  const rows = await db().select().from(t.guests).where(eq(t.guests.sessionId, sessionId));
  return rows.length > 1;
}

export async function setGuestName(guestId: string, name: string) {
  await db().update(t.guests).set({ name: name.trim().slice(0, 24) || null }).where(and(eq(t.guests.id, guestId)));
}
