export const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS outlets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, address TEXT NOT NULL,
    phone TEXT NOT NULL, gstin TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    tax_pct REAL NOT NULL DEFAULT 5, service_charge_pct REAL NOT NULL DEFAULT 0,
    upi_id TEXT NOT NULL, google_place_id TEXT NOT NULL DEFAULT '',
    auto_accept INTEGER NOT NULL DEFAULT 0, review_popup INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, number TEXT NOT NULL, section TEXT NOT NULL,
    seats INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'FREE', state_since INTEGER NOT NULL,
    qr_version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS tables_outlet_idx ON tables(outlet_id)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, table_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'OPEN', opened_at INTEGER NOT NULL, closed_at INTEGER,
    opened_by_staff_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_table_idx ON sessions(table_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_state_idx ON sessions(state)`,
  `CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, name TEXT, device_hash TEXT NOT NULL, joined_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS guests_session_idx ON guests(session_id)`,
  `CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
    section TEXT, pin_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS staff_outlet_idx ON staff(outlet_id)`,
  `CREATE TABLE IF NOT EXISTS menu_categories (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, name TEXT NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, category_id TEXT NOT NULL, name TEXT NOT NULL,
    name_hi TEXT NOT NULL, slug TEXT NOT NULL, description TEXT NOT NULL, price_paise INTEGER NOT NULL,
    image_path TEXT NOT NULL, diet TEXT NOT NULL, spice INTEGER NOT NULL DEFAULT 0,
    allergens TEXT NOT NULL DEFAULT '[]', prep_minutes INTEGER NOT NULL DEFAULT 12,
    available INTEGER NOT NULL DEFAULT 1, unavailable_reason TEXT,
    sort INTEGER NOT NULL DEFAULT 0, pinned INTEGER NOT NULL DEFAULT 0,
    station TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS menu_items_outlet_idx ON menu_items(outlet_id)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, session_id TEXT NOT NULL, table_id TEXT NOT NULL,
    guest_id TEXT NOT NULL, number INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'PLACED',
    total_paise INTEGER NOT NULL, note TEXT, reject_reason TEXT, reject_note TEXT, staff_id TEXT,
    placed_at INTEGER NOT NULL, accepted_at INTEGER, ready_at INTEGER, served_at INTEGER,
    idempotency_key TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS orders_session_idx ON orders(session_id)`,
  `CREATE INDEX IF NOT EXISTS orders_state_idx ON orders(state)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS orders_idem_idx ON orders(idempotency_key)`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, menu_item_id TEXT NOT NULL, name_snapshot TEXT NOT NULL,
    price_paise INTEGER NOT NULL, qty INTEGER NOT NULL, notes TEXT, guest_id TEXT,
    state TEXT NOT NULL DEFAULT 'QUEUED', station TEXT NOT NULL, prep_minutes INTEGER NOT NULL,
    started_at INTEGER, ready_at INTEGER, served_at INTEGER, cancelled_reason TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id)`,
  `CREATE TABLE IF NOT EXISTS kot_tickets (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, station TEXT NOT NULL, number INTEGER NOT NULL,
    printed_at INTEGER NOT NULL, payload TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, session_id TEXT NOT NULL, number TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'DRAFT', subtotal_paise INTEGER NOT NULL DEFAULT 0,
    tax_paise INTEGER NOT NULL DEFAULT 0, service_paise INTEGER NOT NULL DEFAULT 0,
    discount_paise INTEGER NOT NULL DEFAULT 0, discount_reason TEXT,
    tip_paise INTEGER NOT NULL DEFAULT 0, total_paise INTEGER NOT NULL DEFAULT 0,
    split_mode TEXT, created_by_staff_id TEXT, created_at INTEGER NOT NULL, paid_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS bills_session_idx ON bills(session_id)`,
  `CREATE TABLE IF NOT EXISTS bill_splits (
    id TEXT PRIMARY KEY, bill_id TEXT NOT NULL, guest_id TEXT, label TEXT NOT NULL,
    amount_paise INTEGER NOT NULL, paid INTEGER NOT NULL DEFAULT 0, payment_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS bill_splits_bill_idx ON bill_splits(bill_id)`,
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, bill_id TEXT NOT NULL, split_id TEXT, method TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'PENDING', amount_paise INTEGER NOT NULL, provider_ref TEXT,
    upi_intent TEXT, idempotency_key TEXT NOT NULL, created_at INTEGER NOT NULL,
    settled_at INTEGER, collected_by_staff_id TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS payments_bill_idx ON payments(bill_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS payments_idem_idx ON payments(idempotency_key)`,
  `CREATE TABLE IF NOT EXISTS waiter_calls (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, table_id TEXT NOT NULL, reason TEXT NOT NULL,
    note TEXT, created_at INTEGER NOT NULL, sla_due_at INTEGER NOT NULL,
    acknowledged_at INTEGER, resolved_at INTEGER, staff_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, session_id TEXT NOT NULL, bill_id TEXT NOT NULL,
    served_by_staff_id TEXT, rating INTEGER NOT NULL, chips TEXT NOT NULL DEFAULT '[]',
    free_text TEXT, composed TEXT NOT NULL DEFAULT '', route TEXT NOT NULL, coupon_code TEXT,
    manager_alert_at INTEGER, resolved_at INTEGER, reply_text TEXT,
    google_clicked INTEGER NOT NULL DEFAULT 0, held INTEGER NOT NULL DEFAULT 0,
    device_hash TEXT NOT NULL, created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reviews_outlet_idx ON reviews(outlet_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, code TEXT NOT NULL, kind TEXT NOT NULL,
    value INTEGER NOT NULL, label TEXT NOT NULL, min_bill_paise INTEGER NOT NULL DEFAULT 0,
    valid_until INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, review_id TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, outlet_id TEXT NOT NULL, staff_id TEXT, action TEXT NOT NULL,
    entity TEXT NOT NULL, entity_id TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS platform_outlets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, plan TEXT NOT NULL,
    mrr_paise INTEGER NOT NULL, tables_active INTEGER NOT NULL, orders_this_month INTEGER NOT NULL,
    last_login_at INTEGER NOT NULL, churn_risk INTEGER NOT NULL DEFAULT 0,
    is_demo_tenant INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];
