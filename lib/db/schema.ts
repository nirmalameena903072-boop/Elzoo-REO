import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/* ───────────────────────────── Enums as unions ───────────────────────────── */
export const TABLE_STATES = ["FREE", "SEATED", "ORDERING", "DINING", "BILL_REQUESTED", "CLEANING"] as const;
export type TableState = (typeof TABLE_STATES)[number];

export const SESSION_STATES = ["OPEN", "BILLED", "PAID", "CLOSED"] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export const ORDER_STATES = [
  "PLACED", "ACCEPTED", "IN_KITCHEN", "PREPARING", "READY", "SERVED", "BILLED", "PAID", "CANCELLED", "REJECTED",
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

export const ITEM_STATES = ["QUEUED", "PREPARING", "READY", "SERVED", "CANCELLED"] as const;
export type ItemState = (typeof ITEM_STATES)[number];

export const BILL_STATES = ["DRAFT", "REQUESTED", "PARTIALLY_PAID", "PAID", "VOID"] as const;
export type BillState = (typeof BILL_STATES)[number];

export const PAYMENT_METHODS = ["UPI", "CASH", "CARD", "WALLET"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const REVIEW_ROUTES = ["PRIVATE", "GOOGLE"] as const;
export type ReviewRoute = (typeof REVIEW_ROUTES)[number];

export const REJECT_REASONS = ["ITEM_UNAVAILABLE", "KITCHEN_CLOSED", "TABLE_MISMATCH", "DUPLICATE", "OTHER"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const WAITER_CALL_REASONS = ["BILL", "WATER", "PLATE", "CLEAN", "ASSIST", "OTHER"] as const;
export type WaiterCallReason = (typeof WAITER_CALL_REASONS)[number];

export const STATIONS = ["TANDOOR", "CURRY", "CHINESE", "BAR", "DESSERT"] as const;
export type Station = (typeof STATIONS)[number];

export const ROLES = ["WAITER", "MANAGER", "KITCHEN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];

export const DIETS = ["VEG", "NONVEG", "EGG"] as const;
export type Diet = (typeof DIETS)[number];

/* ───────────────────────────────── Tables ───────────────────────────────── */
export const outlets = sqliteTable("outlets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  gstin: text("gstin").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  taxPct: real("tax_pct").notNull().default(5),
  serviceChargePct: real("service_charge_pct").notNull().default(0),
  upiId: text("upi_id").notNull(),
  googlePlaceId: text("google_place_id").notNull().default(""),
  autoAccept: integer("auto_accept", { mode: "boolean" }).notNull().default(false),
  reviewPopup: integer("review_popup", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull(),
});

export const tables = sqliteTable(
  "tables",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    number: text("number").notNull(),
    section: text("section").notNull(),
    seats: integer("seats").notNull(),
    state: text("state").$type<TableState>().notNull().default("FREE"),
    stateSince: integer("state_since").notNull(),
    qrVersion: integer("qr_version").notNull().default(1),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("tables_outlet_idx").on(t.outletId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    tableId: text("table_id").notNull(),
    state: text("state").$type<SessionState>().notNull().default("OPEN"),
    openedAt: integer("opened_at").notNull(),
    closedAt: integer("closed_at"),
    openedByStaffId: text("opened_by_staff_id"),
  },
  (t) => [index("sessions_table_idx").on(t.tableId), index("sessions_state_idx").on(t.state)],
);

export const guests = sqliteTable(
  "guests",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    name: text("name"),
    deviceHash: text("device_hash").notNull(),
    joinedAt: integer("joined_at").notNull(),
  },
  (t) => [index("guests_session_idx").on(t.sessionId)],
);

export const staff = sqliteTable(
  "staff",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    name: text("name").notNull(),
    role: text("role").$type<Role>().notNull(),
    section: text("section"),
    pinHash: text("pin_hash").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("staff_outlet_idx").on(t.outletId)],
);

export const menuCategories = sqliteTable("menu_categories", {
  id: text("id").primaryKey(),
  outletId: text("outlet_id").notNull(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const menuItems = sqliteTable(
  "menu_items",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    categoryId: text("category_id").notNull(),
    name: text("name").notNull(),
    nameHi: text("name_hi").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    pricePaise: integer("price_paise").notNull(),
    imagePath: text("image_path").notNull(),
    diet: text("diet").$type<Diet>().notNull(),
    spice: integer("spice").notNull().default(0),
    allergens: text("allergens").notNull().default("[]"),
    prepMinutes: integer("prep_minutes").notNull().default(12),
    available: integer("available", { mode: "boolean" }).notNull().default(true),
    unavailableReason: text("unavailable_reason"),
    sort: integer("sort").notNull().default(0),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    station: text("station").$type<Station>().notNull(),
  },
  (t) => [index("menu_items_outlet_idx").on(t.outletId)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    sessionId: text("session_id").notNull(),
    tableId: text("table_id").notNull(),
    guestId: text("guest_id").notNull(),
    number: integer("number").notNull(),
    state: text("state").$type<OrderState>().notNull().default("PLACED"),
    totalPaise: integer("total_paise").notNull(),
    note: text("note"),
    rejectReason: text("reject_reason").$type<RejectReason>(),
    rejectNote: text("reject_note"),
    staffId: text("staff_id"),
    placedAt: integer("placed_at").notNull(),
    acceptedAt: integer("accepted_at"),
    readyAt: integer("ready_at"),
    servedAt: integer("served_at"),
    idempotencyKey: text("idempotency_key").notNull(),
  },
  (t) => [
    index("orders_session_idx").on(t.sessionId),
    index("orders_state_idx").on(t.state),
    uniqueIndex("orders_idem_idx").on(t.idempotencyKey),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    menuItemId: text("menu_item_id").notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    pricePaise: integer("price_paise").notNull(),
    qty: integer("qty").notNull(),
    notes: text("notes"),
    guestId: text("guest_id"),
    state: text("state").$type<ItemState>().notNull().default("QUEUED"),
    station: text("station").$type<Station>().notNull(),
    prepMinutes: integer("prep_minutes").notNull(),
    startedAt: integer("started_at"),
    readyAt: integer("ready_at"),
    servedAt: integer("served_at"),
    cancelledReason: text("cancelled_reason"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const kotTickets = sqliteTable("kot_tickets", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  station: text("station").$type<Station>().notNull(),
  number: integer("number").notNull(),
  printedAt: integer("printed_at").notNull(),
  payload: text("payload").notNull(),
});

export const bills = sqliteTable(
  "bills",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    sessionId: text("session_id").notNull(),
    number: text("number").notNull(),
    state: text("state").$type<BillState>().notNull().default("DRAFT"),
    subtotalPaise: integer("subtotal_paise").notNull().default(0),
    taxPaise: integer("tax_paise").notNull().default(0),
    servicePaise: integer("service_paise").notNull().default(0),
    discountPaise: integer("discount_paise").notNull().default(0),
    discountReason: text("discount_reason"),
    tipPaise: integer("tip_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull().default(0),
    splitMode: text("split_mode"),
    createdByStaffId: text("created_by_staff_id"),
    createdAt: integer("created_at").notNull(),
    paidAt: integer("paid_at"),
  },
  (t) => [index("bills_session_idx").on(t.sessionId)],
);

export const billSplits = sqliteTable(
  "bill_splits",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id").notNull(),
    guestId: text("guest_id"),
    label: text("label").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    paymentId: text("payment_id"),
  },
  (t) => [index("bill_splits_bill_idx").on(t.billId)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id").notNull(),
    splitId: text("split_id"),
    method: text("method").$type<PaymentMethod>().notNull(),
    state: text("state").$type<PaymentState>().notNull().default("PENDING"),
    amountPaise: integer("amount_paise").notNull(),
    providerRef: text("provider_ref"),
    upiIntent: text("upi_intent"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: integer("created_at").notNull(),
    settledAt: integer("settled_at"),
    collectedByStaffId: text("collected_by_staff_id"),
  },
  (t) => [index("payments_bill_idx").on(t.billId), uniqueIndex("payments_idem_idx").on(t.idempotencyKey)],
);

export const waiterCalls = sqliteTable("waiter_calls", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  tableId: text("table_id").notNull(),
  reason: text("reason").$type<WaiterCallReason>().notNull(),
  note: text("note"),
  createdAt: integer("created_at").notNull(),
  slaDueAt: integer("sla_due_at").notNull(),
  acknowledgedAt: integer("acknowledged_at"),
  resolvedAt: integer("resolved_at"),
  staffId: text("staff_id"),
});

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    outletId: text("outlet_id").notNull(),
    sessionId: text("session_id").notNull(),
    billId: text("bill_id").notNull(),
    servedByStaffId: text("served_by_staff_id"),
    rating: integer("rating").notNull(),
    chips: text("chips").notNull().default("[]"),
    freeText: text("free_text"),
    composed: text("composed").notNull().default(""),
    route: text("route").$type<ReviewRoute>().notNull(),
    couponCode: text("coupon_code"),
    managerAlertAt: integer("manager_alert_at"),
    resolvedAt: integer("resolved_at"),
    replyText: text("reply_text"),
    googleClicked: integer("google_clicked", { mode: "boolean" }).notNull().default(false),
    held: integer("held", { mode: "boolean" }).notNull().default(false),
    deviceHash: text("device_hash").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("reviews_outlet_idx").on(t.outletId, t.createdAt)],
);

export const coupons = sqliteTable("coupons", {
  id: text("id").primaryKey(),
  outletId: text("outlet_id").notNull(),
  code: text("code").notNull(),
  kind: text("kind").$type<"PERCENT" | "FLAT" | "ITEM">().notNull(),
  value: integer("value").notNull(),
  label: text("label").notNull(),
  minBillPaise: integer("min_bill_paise").notNull().default(0),
  validUntil: integer("valid_until").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  reviewId: text("review_id"),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  outletId: text("outlet_id").notNull(),
  staffId: text("staff_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  meta: text("meta").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

/* platform layer */
export const platformOutlets = sqliteTable("platform_outlets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  plan: text("plan").notNull(),
  mrrPaise: integer("mrr_paise").notNull(),
  tablesActive: integer("tables_active").notNull(),
  ordersThisMonth: integer("orders_this_month").notNull(),
  lastLoginAt: integer("last_login_at").notNull(),
  churnRisk: integer("churn_risk", { mode: "boolean" }).notNull().default(false),
  isDemoTenant: integer("is_demo_tenant", { mode: "boolean" }).notNull().default(false),
});

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Outlet = typeof outlets.$inferSelect;
export type Table = typeof tables.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Guest = typeof guests.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillSplit = typeof billSplits.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type WaiterCall = typeof waiterCalls.$inferSelect;
export type PlatformOutlet = typeof platformOutlets.$inferSelect;
