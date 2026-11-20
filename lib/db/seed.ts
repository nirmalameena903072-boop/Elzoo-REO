import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as t from "./schema";
import { CATEGORIES, ITEMS } from "@/lib/data/menu";
import { hashPin, newId, deviceHash } from "@/lib/utils/ids";
import { DAY, HOUR, MINUTE, startOfDay } from "@/lib/utils/time";

const OUTLET = "out_alsa";
const now = Date.now();

const GUEST_NAMES = ["Rahul", "Priya", "Aman", "Neha", "Kabir", "Sana", "Vikram", "Ishita", "Rohit", "Meera", "Arjun", "Tara"];
const POS_CHIPS = [
  "Khana bahut tasty tha", "Presentation badhiya thi", "Waiter bahut polite tha", "Service fast thi",
  "Portion size achha tha", "Value for money", "Ambience accha hai", "Safai achhi thi",
  "Family ke saath perfect", "Phir aana chahunga",
];
const NEG_CHIPS = [
  "Khana thanda aaya", "Bahut wait karna pada", "Waiter ne dhyaan nahi diya", "Portion chhota tha",
  "Mehnga laga", "Order galat aaya", "Table gandi thi", "AC theek nahi tha", "Taste average tha", "Bill mein gadbad thi",
];

/** Deterministic PRNG so the charts have the same shape on every reseed. */
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

export async function seedAll(db: LibSQLDatabase<typeof t>) {
  const rand = rng(20261120);
  const pick = <V,>(arr: readonly V[]): V => arr[Math.floor(rand() * arr.length)]!;
  const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

  /* ─ outlet ─────────────────────────────────────────────────────────── */
  await db.insert(t.outlets).values({
    id: OUTLET, name: "Alsa", slug: "alsa",
    address: "14/112 Civil Lines, Kanpur, Uttar Pradesh 208001",
    phone: "+91 512 240 8891", gstin: "09AABCA1234F1Z5", timezone: "Asia/Kolkata",
    taxPct: 5, serviceChargePct: 0, upiId: "alsa@mock", googlePlaceId: "ChIJalsaKanpurDemo",
    autoAccept: false, reviewPopup: true, createdAt: now - 400 * DAY,
  });
  await db.insert(t.meta).values([
    { key: "seeded_at", value: String(now) },
    { key: "version", value: "1.0.0" },
  ]);

  /* ─ staff ──────────────────────────────────────────────────────────── */
  const crew: Array<{ id: string; name: string; role: t.Role; section: string | null; pin: string }> = [
    { id: "stf_rita", name: "Rita Yadav", role: "WAITER", section: "A", pin: "1111" },
    { id: "stf_sameer", name: "Sameer Khan", role: "WAITER", section: "B", pin: "1111" },
    { id: "stf_jitender", name: "Jitender Pal", role: "WAITER", section: "C", pin: "1111" },
    { id: "stf_meera", name: "Meera Sethi", role: "MANAGER", section: null, pin: "2222" },
    { id: "stf_hari", name: "Hari Prasad", role: "KITCHEN", section: null, pin: "3333" },
    { id: "stf_nazia", name: "Nazia Ansari", role: "KITCHEN", section: null, pin: "3333" },
    { id: "stf_owner", name: "Aditya Raghav", role: "OWNER", section: null, pin: "4444" },
    { id: "stf_gopal", name: "Gopal Mishra", role: "WAITER", section: "A", pin: "1111" },
  ];
  await db.insert(t.staff).values(
    crew.map((c) => ({
      id: c.id, outletId: OUTLET, name: c.name, role: c.role, section: c.section,
      pinHash: hashPin(c.pin), active: true, createdAt: now - 120 * DAY,
    })),
  );

  /* ─ tables ─────────────────────────────────────────────────────────── */
  const seats = [2, 4, 4, 6, 2, 4, 2, 4, 6, 4, 2, 8];
  const floor = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    return {
      id: `tbl_t${n}`, outletId: OUTLET, number: `T${n}`,
      section: n <= 5 ? "A" : n <= 9 ? "B" : "C",
      seats: seats[i] ?? 4, state: "FREE" as t.TableState,
      stateSince: startOfDay(now) + 11 * HOUR, qrVersion: 1, createdAt: now - 400 * DAY,
    };
  });
  await db.insert(t.tables).values(floor);

  /* ─ menu ───────────────────────────────────────────────────────────── */
  await db.insert(t.menuCategories).values(
    CATEGORIES.map((c) => ({ id: c.id, outletId: OUTLET, name: c.name, sort: c.sort, active: true })),
  );
  const itemRows = ITEMS.map((it) => ({
    id: it.id, outletId: OUTLET, categoryId: it.categoryId, name: it.name, nameHi: it.nameHi,
    slug: it.slug, description: it.description, pricePaise: it.price * 100,
    imagePath: `/dishes/${it.slug}`, diet: it.diet, spice: it.spice,
    allergens: JSON.stringify(it.allergens), prepMinutes: it.prepMinutes,
    available: true, unavailableReason: null, sort: it.sort, pinned: it.pinned ?? false, station: it.station,
  }));
  await db.insert(t.menuItems).values(itemRows);
  const menu = new Map(itemRows.map((i) => [i.id, i]));
  const priceOf = (id: string) => menu.get(id)?.pricePaise ?? 0;
  const metaOf = (id: string) => menu.get(id)!;

  /* ─ live service: T5 mid-meal ──────────────────────────────────────── */
  const sesT5 = newId("ses");
  await db.insert(t.sessions).values({
    id: sesT5, outletId: OUTLET, tableId: "tbl_t5", state: "OPEN",
    openedAt: now - 38 * MINUTE, openedByStaffId: "stf_rita",
  });
  const gu1 = newId("gst");
  await db.insert(t.guests).values([
    { id: gu1, sessionId: sesT5, name: "Rahul", deviceHash: deviceHash("seed-a"), joinedAt: now - 38 * MINUTE },
    { id: newId("gst"), sessionId: sesT5, name: "Priya", deviceHash: deviceHash("seed-b"), joinedAt: now - 33 * MINUTE },
  ]);
  await db.update(t.tables).set({ state: "DINING", stateSince: now - 31 * MINUTE }).where(eq(t.tables.id, "tbl_t5"));

  const liveLines = [
    { id: "itm_dal_makhani", qty: 1, state: "READY" as t.ItemState, note: null as string | null, startAgo: 17 },
    { id: "itm_naan", qty: 2, state: "READY" as t.ItemState, note: "Extra butter", startAgo: 6 },
    { id: "itm_butter_chicken", qty: 1, state: "PREPARING" as t.ItemState, note: null as string | null, startAgo: 9 },
  ];
  const liveOrder = newId("ord");
  const liveSubtotal = liveLines.reduce((acc, l) => acc + priceOf(l.id) * l.qty, 0);
  await db.insert(t.orders).values({
    id: liveOrder, outletId: OUTLET, sessionId: sesT5, tableId: "tbl_t5", guestId: gu1, number: 1041,
    state: "PREPARING", totalPaise: liveSubtotal, note: null, staffId: "stf_rita",
    placedAt: now - 18 * MINUTE, acceptedAt: now - 17 * MINUTE, idempotencyKey: "seed-live-order",
  });
  await db.insert(t.orderItems).values(
    liveLines.map((l) => {
      const it = metaOf(l.id);
      return {
        id: newId("oit"), orderId: liveOrder, menuItemId: it.id, nameSnapshot: it.name,
        pricePaise: it.pricePaise, qty: l.qty, notes: l.note, guestId: gu1, state: l.state,
        station: it.station, prepMinutes: it.prepMinutes, startedAt: now - l.startAgo * MINUTE,
        readyAt: l.state === "READY" ? now - 2 * MINUTE : null,
      };
    }),
  );
  await db.insert(t.kotTickets).values([
    { id: newId("kot"), orderId: liveOrder, station: "CURRY", number: 331, printedAt: now - 17 * MINUTE, payload: "{}" },
    { id: newId("kot"), orderId: liveOrder, station: "TANDOOR", number: 332, printedAt: now - 17 * MINUTE, payload: "{}" },
  ]);

  /* ─ T8: order sitting in the staff queue (PLACED, 3 min old) ────────── */
  const sesT8 = newId("ses");
  await db.insert(t.sessions).values({ id: sesT8, outletId: OUTLET, tableId: "tbl_t8", state: "OPEN", openedAt: now - 6 * MINUTE });
  const guT8 = newId("gst");
  await db.insert(t.guests).values({ id: guT8, sessionId: sesT8, name: "Kabir", deviceHash: deviceHash("seed-c"), joinedAt: now - 6 * MINUTE });
  await db.update(t.tables).set({ state: "ORDERING", stateSince: now - 5 * MINUTE }).where(eq(t.tables.id, "tbl_t8"));
  const ordT8 = newId("ord");
  const t8Lines = [
    { id: "itm_paneer_tikka", qty: 1, note: null as string | null },
    { id: "itm_dal_makhani", qty: 1, note: "No cream" },
    { id: "itm_laccha", qty: 1, note: null as string | null },
  ];
  await db.insert(t.orders).values({
    id: ordT8, outletId: OUTLET, sessionId: sesT8, tableId: "tbl_t8", guestId: guT8, number: 1042,
    state: "PLACED", totalPaise: t8Lines.reduce((a, l) => a + priceOf(l.id) * l.qty, 0),
    note: "Less oil, please.", placedAt: now - 3 * MINUTE, idempotencyKey: "seed-t8-order",
  });
  await db.insert(t.orderItems).values(
    t8Lines.map((l) => {
      const it = metaOf(l.id);
      return {
        id: newId("oit"), orderId: ordT8, menuItemId: it.id, nameSnapshot: it.name, pricePaise: it.pricePaise,
        qty: l.qty, notes: l.note, guestId: guT8, state: "QUEUED" as t.ItemState, station: it.station, prepMinutes: it.prepMinutes,
      };
    }),
  );

  /* ─ T11: bill called, already past SLA ─────────────────────────────── */
  const sesT11 = newId("ses");
  await db.insert(t.sessions).values({ id: sesT11, outletId: OUTLET, tableId: "tbl_t11", state: "OPEN", openedAt: now - 52 * MINUTE, openedByStaffId: "stf_jitender" });
  await db.insert(t.guests).values({ id: newId("gst"), sessionId: sesT11, name: "Ishita", deviceHash: deviceHash("seed-d"), joinedAt: now - 52 * MINUTE });
  await db.update(t.tables).set({ state: "BILL_REQUESTED", stateSince: now - 2 * MINUTE }).where(eq(t.tables.id, "tbl_t11"));
  await db.insert(t.waiterCalls).values({
    id: newId("wcl"), sessionId: sesT11, tableId: "tbl_t11", reason: "BILL",
    createdAt: now - 130_000, slaDueAt: now - 40_000,
  });

  /* ─ T2 seated, T10 cleaning ────────────────────────────────────────── */
  const sesT2 = newId("ses");
  await db.insert(t.sessions).values({ id: sesT2, outletId: OUTLET, tableId: "tbl_t2", state: "OPEN", openedAt: now - 4 * MINUTE, openedByStaffId: "stf_rita" });
  await db.insert(t.guests).values({ id: newId("gst"), sessionId: sesT2, name: null, deviceHash: deviceHash("seed-e"), joinedAt: now - 4 * MINUTE });
  await db.update(t.tables).set({ state: "SEATED", stateSince: now - 4 * MINUTE }).where(eq(t.tables.id, "tbl_t2"));
  await db.update(t.tables).set({ state: "CLEANING", stateSince: now - 6 * MINUTE }).where(eq(t.tables.id, "tbl_t10"));

  /* ─ 14 days of service ─────────────────────────────────────────────── */
  let orderNo = 940;
  let kotNo = 210;
  let billNo = 640;
  const reviewHistory: Array<{ rating: number; daysAgo: number; chips: string[]; text: string; route: t.ReviewRoute }> = [];

  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const dayStart = startOfDay(now) - daysAgo * DAY;
    const weekday = new Date(dayStart + 12 * HOUR).getDay();
    const weekend = weekday === 0 || weekday === 5 || weekday === 6;
    const covers = weekend ? between(5, 7) : between(3, 5);

    for (let c = 0; c < covers; c++) {
      const hour = rand() < 0.55 ? between(20, 21) : rand() < 0.5 ? between(19, 19) : between(13, 15);
      const placedAt = dayStart + hour * HOUR + between(0, 59) * MINUTE;
      const table = floor[between(0, 11)]!;
      const sessionId = newId("ses");
      const guestId = newId("gst");
      const staffId = pick(["stf_rita", "stf_sameer", "stf_jitender", "stf_gopal"]);
      await db.insert(t.sessions).values({
        id: sessionId, outletId: OUTLET, tableId: table.id, state: "CLOSED",
        openedAt: placedAt - 6 * MINUTE, closedAt: placedAt + 62 * MINUTE, openedByStaffId: staffId,
      });
      await db.insert(t.guests).values({
        id: guestId, sessionId, name: pick(GUEST_NAMES), deviceHash: deviceHash(`seed-${daysAgo}-${c}`), joinedAt: placedAt - 6 * MINUTE,
      });

      const chosen = new Set<string>();
      const wanted = between(2, 4);
      let guard = 0;
      while (chosen.size < wanted && guard++ < 40) chosen.add(pick(itemRows).id);
      let subtotal = 0;
      const lines = [...chosen].map((id) => {
        const it = metaOf(id);
        const qty = rand() < 0.22 ? 2 : 1;
        subtotal += it.pricePaise * qty;
        return { it, qty };
      });
      const tax = Math.round(subtotal * 0.05);
      const serviceSec = between(9 * 60, 26 * 60);
      const orderId = newId("ord");
      await db.insert(t.orders).values({
        id: orderId, outletId: OUTLET, sessionId, tableId: table.id, guestId, number: orderNo++, state: "PAID",
        totalPaise: subtotal, staffId, placedAt, acceptedAt: placedAt + 38_000,
        readyAt: placedAt + serviceSec * 1000, servedAt: placedAt + (serviceSec + 240) * 1000,
        idempotencyKey: `seed-${orderId}`,
      });
      await db.insert(t.orderItems).values(
        lines.map(({ it, qty }) => ({
          id: newId("oit"), orderId, menuItemId: it.id, nameSnapshot: it.name, pricePaise: it.pricePaise, qty,
          guestId, state: "SERVED" as t.ItemState, station: it.station, prepMinutes: it.prepMinutes,
          startedAt: placedAt + 60_000, readyAt: placedAt + serviceSec * 1000,
          servedAt: placedAt + (serviceSec + 200) * 1000,
        })),
      );
      await db.insert(t.kotTickets).values(
        [...new Set(lines.map((l) => l.it.station))].map((station) => ({
          id: newId("kot"), orderId, station, number: kotNo++, printedAt: placedAt + 40_000, payload: "{}",
        })),
      );
      const billId = newId("bil");
      await db.insert(t.bills).values({
        id: billId, outletId: OUTLET, sessionId, number: `INV-${billNo++}`, state: "PAID",
        subtotalPaise: subtotal, taxPaise: tax, servicePaise: 0, discountPaise: 0, tipPaise: 0,
        totalPaise: subtotal + tax, splitMode: rand() < 0.25 ? "EQUAL" : null,
        createdByStaffId: "stf_meera", createdAt: placedAt + 62 * MINUTE, paidAt: placedAt + 66 * MINUTE,
      });
      await db.insert(t.payments).values({
        id: newId("pay"), billId, method: rand() < 0.62 ? "UPI" : rand() < 0.7 ? "CASH" : "CARD",
        state: "SUCCESS", amountPaise: subtotal + tax, providerRef: `mock_${Math.random().toString(36).slice(2, 10)}`,
        idempotencyKey: `seed-pay-${billId}`, createdAt: placedAt + 63 * MINUTE,
        settledAt: placedAt + 66 * MINUTE, collectedByStaffId: "stf_meera",
      });

      if (c === 0) {
        const rating = pick([5, 5, 5, 4, 4, 4, 3, 3, 2, 5, 4]);
        reviewHistory.push({
          rating, daysAgo,
          chips: rating >= 4 ? [pick(POS_CHIPS)] : [pick(NEG_CHIPS)],
          text: rating >= 4
            ? pick(["Biryani was the highlight.", "Came back after two months, still consistent.", "Staff remembered our usual order.", ""])
            : pick(["Ordered mild, got medium.", "Waited 35 minutes for the mains.", "Bill had an extra naan.", ""]),
          route: rating >= 4 ? "GOOGLE" : "PRIVATE",
        });
      }
    }
  }

  /* ─ reviews: mixed, average ~4.4 ───────────────────────────────────── */
  let fill = 0;
  while (reviewHistory.length < 20) {
    const rating = [5, 4, 5, 3, 4, 5, 2][fill % 7]!;
    reviewHistory.push({
      rating, daysAgo: (fill % 12) + 1,
      chips: rating >= 4 ? [POS_CHIPS[fill % 10]!] : [NEG_CHIPS[fill % 10]!],
      text: rating >= 4 ? "Good food, will come again." : "",
      route: rating >= 4 ? "GOOGLE" : "PRIVATE",
    });
    fill++;
  }
  const billsForReviews = await db.select().from(t.bills).limit(24);
  for (const [index, r] of reviewHistory.entries()) {
    const at = startOfDay(now) - r.daysAgo * DAY + 22 * HOUR;
    const bill = billsForReviews[index % Math.max(1, billsForReviews.length)];
    await db.insert(t.reviews).values({
      id: newId("rev"), outletId: OUTLET, sessionId: bill?.sessionId ?? sesT5, billId: bill?.id ?? "bil_seed",
      servedByStaffId: "stf_rita", rating: r.rating, chips: JSON.stringify(r.chips), freeText: r.text || null,
      composed: [...r.chips, r.text].filter(Boolean).join(". "), route: r.route,
      managerAlertAt: r.rating <= 3 ? at + 60_000 : null,
      resolvedAt: r.rating <= 3 && r.daysAgo > 4 ? at + 2 * HOUR : null,
      googleClicked: r.route === "GOOGLE" && rand() < 0.4,
      deviceHash: deviceHash(`rev-${r.daysAgo}`), createdAt: at,
    });
  }

  /* ─ three historic waiter calls ────────────────────────────────────── */
  for (let i = 1; i <= 3; i++) {
    const at = startOfDay(now) - i * DAY + 20 * HOUR;
    await db.insert(t.waiterCalls).values({
      id: newId("wcl"), sessionId: newId("ses"), tableId: `tbl_t${i * 3}`, reason: pick(["WATER", "PLATE", "ASSIST"]),
      createdAt: at, slaDueAt: at + 90_000, acknowledgedAt: at + 45_000, resolvedAt: at + 70_000, staffId: "stf_rita",
    });
  }

  /* ─ platform tenants ───────────────────────────────────────────────── */
  await db.insert(t.platformOutlets).values([
    { id: OUTLET, name: "Alsa", city: "Kanpur", plan: "Growth", mrrPaise: 299000, tablesActive: 12, ordersThisMonth: 1284, lastLoginAt: now - 2 * HOUR, churnRisk: false, isDemoTenant: true },
    { id: "out_tandoor", name: "Tandoor House", city: "Lucknow", plan: "Growth", mrrPaise: 299000, tablesActive: 18, ordersThisMonth: 1902, lastLoginAt: now - 5 * HOUR, churnRisk: false, isDemoTenant: false },
    { id: "out_mocha", name: "Café Mocha Lane", city: "Kanpur", plan: "Starter", mrrPaise: 149000, tablesActive: 9, ordersThisMonth: 640, lastLoginAt: now - 11 * DAY, churnRisk: true, isDemoTenant: false },
    { id: "out_biryani", name: "Biryani Chapter", city: "Delhi", plan: "Growth", mrrPaise: 299000, tablesActive: 15, ordersThisMonth: 1511, lastLoginAt: now - 8 * DAY, churnRisk: true, isDemoTenant: false },
  ]);

  /* ─ audit trail so the Z-report has discounts to reconcile ─────────── */
  const reasons = ["Regular customer", "Service recovery", "Staff meal", "Other"];
  for (let d = 0; d < 6; d++) {
    await db.insert(t.auditLog).values({
      id: newId("aud"), outletId: OUTLET, staffId: "stf_meera", action: "discount.applied",
      entity: "bill", entityId: `bil_hist_${d}`, meta: JSON.stringify({ pct: 10, reason: reasons[d % 4] }),
      createdAt: startOfDay(now) - (d + 1) * DAY + 21 * HOUR,
    });
  }
}
