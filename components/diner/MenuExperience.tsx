"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, Plus, Minus, Clock, Flame, Leaf, Users } from "lucide-react";
import type { Diet, Station } from "@/lib/db/schema";
import { DietMark } from "@/components/ui/DietMark";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { GlassTextarea } from "@/components/ui/GlassInput";
import { rupee } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { idemKey } from "@/lib/utils/idem";
import { AlsaWordmark } from "@/components/brand/Marks";

export type MenuItemView = {
  id: string;
  name: string;
  nameHi: string;
  slug: string;
  description: string;
  pricePaise: number;
  diet: Diet;
  spice: number;
  station: Station;
  prepMinutes: number;
  available: boolean;
  categoryId: string;
  allergens: string;
};

type DinerInfo = {
  tableNumber: string;
  guestId: string;
  guestName: string | null;
  guestCount: number;
  sessionId: string;
  tableState: string;
};

type CartLine = { itemId: string; qty: number; notes: string };

export function MenuExperience({
  diner,
  menu,
  activeOrders,
}: {
  diner: DinerInfo;
  menu: { categories: Array<{ id: string; name: string }>; items: MenuItemView[] };
  activeOrders: Array<{ id: string; number: number; state: string }>;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState(menu.categories[0]?.id ?? "");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [detail, setDetail] = useState<MenuItemView | null>(null);
  const [namePrompt, setNamePrompt] = useState(diner.guestCount > 1 && !diner.guestName);
  const [nameDraft, setNameDraft] = useState("");
  const [placing, setPlacing] = useState(false);
  const [dupeWarning, setDupeWarning] = useState<Array<{ name: string; guest: string | null }>>([]);
  const [orderNote, setOrderNote] = useState("");
  const [toastText, setToastText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, MenuItemView[]>();
    for (const item of menu.items) {
      if (!map.has(item.categoryId)) map.set(item.categoryId, []);
      map.get(item.categoryId)!.push(item);
    }
    return map;
  }, [menu.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.items.filter((item) => {
      if (vegOnly && item.diet !== "VEG") return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.nameHi.includes(query.trim()) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [menu.items, query, vegOnly]);

  const lines = Object.values(cart).filter((l) => l.qty > 0);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + (menu.items.find((i) => i.id === l.itemId)?.pricePaise ?? 0) * l.qty, 0);
  const tax = Math.round(subtotal * 0.05);

  const add = (item: MenuItemView) => {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev[item.id];
      return { ...prev, [item.id]: { itemId: item.id, qty: (existing?.qty ?? 0) + 1, notes: existing?.notes ?? "" } };
    });
    setToastText(`${item.name} added`);
  };
  const step = (itemId: string, delta: number) => {
    setCart((prev) => {
      const line = prev[itemId];
      if (!line) return prev;
      const qty = line.qty + delta;
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = { ...line, qty };
      return next;
    });
  };

  useEffect(() => {
    if (!toastText) return;
    const timer = window.setTimeout(() => setToastText(null), 1900);
    return () => window.clearTimeout(timer);
  }, [toastText]);

  const existingCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) map.set(line.itemId, line.qty);
    return map;
  }, [lines]);
  // quantity already on the table, surfaced on each menu card
  void existingCounts;

  const openReview = () => {
    if (count === 0) return;
    setReviewOpen(true);
    // Ask the server about duplicate items inside the 10-minute window (warning only, never a block).
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    fetch(`/api/t/${diner.tableNumber}/duplicates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: lines.map((l) => ({ menuItemId: l.itemId, notes: l.notes || null })) }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: { ok: boolean; data?: { duplicates: Array<{ name: string; guest: string | null }> } }) => {
        if (json.ok && json.data) setDupeWarning(json.data.duplicates);
      })
      .catch(() => {});
  };

  const placeOrder = async () => {
    if (placing || count === 0) return;
    setPlacing(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey("ord") },
        body: JSON.stringify({
          tableNumber: diner.tableNumber,
          lines: lines.map((l) => ({ menuItemId: l.itemId, qty: l.qty, notes: l.notes || null })),
          note: orderNote || null,
        }),
      });
      const json = (await response.json()) as
        | { ok: true; data: { orderId: string } }
        | { ok: false; message: string };
      if (!json.ok) {
        setToastText(json.message);
        setPlacing(false);
        return;
      }
      setCart({});
      setReviewOpen(false);
      router.push(`/t/${diner.tableNumber}/order/${json.data.orderId}`);
    } catch {
      setToastText("Network atka — dobara try karein.");
      setPlacing(false);
    }
  };

  const saveName = async (skip = false) => {
    setNamePrompt(false);
    if (skip || !nameDraft.trim()) return;
    await fetch("/api/guests/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId: diner.guestId, name: nameDraft.trim() }),
    });
    router.refresh();
  };

  const categories = menu.categories.filter((c) => (byCategory.get(c.id) ?? []).some((i) => i.available || filtered.includes(i)));
  const showCategories = query.trim().length === 0 && !vegOnly;

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[520px] bg-ink-900/40 pb-[112px] sm:max-w-[640px]">
      {/* header */}
      <header className="sticky top-0 z-30">
        <div className="glass-e3 rounded-none border-x-0 border-t-0 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlsaWordmark className="h-[20px] w-auto text-cream-0" />
              <span className="text-[11px] text-cream-2">·</span>
              <span className="text-[13px] text-cream-1">
                {diner.tableNumber}
                {diner.guestName ? ` · ${diner.guestName}` : ""}
              </span>
              {diner.guestCount > 1 && (
                <span className="flex items-center gap-1 rounded-full border border-[var(--hairline)] px-1.5 py-[2px] text-[10px] text-cream-2">
                  <Users size={9} strokeWidth={2} />
                  {diner.guestCount}
                </span>
              )}
            </div>
            <Link
              href={`/t/${diner.tableNumber}/table`}
              className="flex items-center gap-1.5 text-[12px] text-cream-1 underline decoration-[var(--hairline-strong)] underline-offset-4"
            >
              Table
            </Link>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream-2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Dish dhoondein"
                aria-label="Search the menu"
                className="field h-10 pl-9 text-[13px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setVegOnly((v) => !v)}
              aria-pressed={vegOnly}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] border px-3 text-[12px] transition-colors",
                vegOnly
                  ? "border-[rgba(63,167,106,.5)] bg-[rgba(63,167,106,.16)] text-[#c8ecd6]"
                  : "border-[var(--hairline-strong)] bg-white/[.04] text-cream-1",
              )}
            >
              <Leaf size={13} strokeWidth={1.6} aria-hidden="true" />
              Veg
            </button>
          </div>
        </div>

        {showCategories && (
          <nav aria-label="Menu categories" className="no-scrollbar flex gap-2 overflow-x-auto border-b border-[var(--hairline)] bg-[rgba(10,11,13,.62)] px-4 py-2.5 backdrop-blur-xl sm:px-5">
            {categories.map((c) => (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                onClick={() => setActiveCategory(c.id)}
                aria-current={activeCategory === c.id ? "true" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-[7px] text-[12px] transition-colors",
                  activeCategory === c.id
                    ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.14)] text-[#f5dfc2]"
                    : "border-[var(--hairline)] bg-white/[.03] text-cream-1",
                )}
              >
                {c.name}
              </a>
            ))}
        </nav>
        )}
      </header>

      {activeOrders.length > 0 && (
        <div className="px-4 pt-3 sm:px-5">
          {activeOrders.map((o) => (
            <Link
              key={o.id}
              href={`/t/${diner.tableNumber}/order/${o.id}`}
              className="glass-e1 glass-hover flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="flex items-center gap-2.5 text-[13px]">
                <span className="live-dot" aria-hidden="true" />
                Order #{o.number} kitchen mein hai
              </span>
              <span className="text-[12px] text-cream-2">Status dekhein</span>
            </Link>
          ))}
        </div>
      )}

      <main className="px-4 pt-5 sm:px-5">
        {query.trim() && (
          <p className="mb-4 text-[12px] text-cream-2" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "dish" : "dishes"} · “{query.trim()}”
          </p>
        )}

        {query.trim() || vegOnly ? (
          <section aria-label="Search results" className="flex flex-col gap-2">
            {filtered.length === 0 && (
              <div className="glass-e1 p-6">
                <p className="text-[14px] text-cream-1">Is naam se kuch nahi mila.</p>
                <p className="mt-1.5 text-[13px] text-cream-2">
                  Try “paneer”, “biryani” ya “naan” — ya Veg filter hata ke dekhein.
                </p>
              </div>
            )}
            {filtered.map((item) => (
              <DishRow key={item.id} item={item} onAdd={() => add(item)} onOpen={() => setDetail(item)} qty={cart[item.id]?.qty ?? 0} onStep={step} />
            ))}
          </section>
        ) : (
          menu.categories.map((category) => {
            const items = byCategory.get(category.id) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={category.id} id={`cat-${category.id}`} className="mb-8 scroll-mt-[152px]" aria-labelledby={`h-${category.id}`}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 id={`h-${category.id}`} className="text-[17px] font-medium tracking-[-0.02em] text-cream-0" style={{ fontFamily: "var(--font-display)" }}>
                    {category.name}
                  </h2>
                  <span className="text-[11px] text-cream-2">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <DishRow key={item.id} item={item} onAdd={() => add(item)} onOpen={() => setDetail(item)} qty={cart[item.id]?.qty ?? 0} onStep={step} />
                  ))}
                </div>
              </section>
            );
          })
        )}

        <p className="mt-10 text-center text-[11px] leading-relaxed text-cream-2">
          GST 5% bill pe lagta hai · Demo environment, no money moves
        </p>
      </main>

      {/* sticky cart bar */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{ type: reduce ? "tween" : "spring", stiffness: 320, damping: 30, duration: reduce ? 0.12 : undefined }}
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4"
          >
            <div className="mx-auto w-full max-w-[496px] sm:max-w-[616px]">
              <button
                type="button"
                onClick={openReview}
                className="btn btn-primary h-[54px] w-full justify-between rounded-[16px] px-5 text-[14px]"
              >
                <span className="flex items-center gap-2">
                  <span className="mono rounded-md bg-[rgba(26,18,6,.14)] px-1.5 py-0.5 text-[12px]">{count}</span>
                  Review order
                </span>
                <span className="mono">{rupee(subtotal)}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {toastText && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[86px] z-50 flex justify-center px-6" role="status" aria-live="polite">
          <div className="glass-e3 rounded-full px-4 py-2 text-[12px] text-cream-0">{toastText}</div>
        </div>
      )}

      {/* item detail */}
      <GlassSheet open={!!detail} onClose={() => setDetail(null)} label={detail?.name}>
        {detail && (
          <div>
            <div className="relative -mx-5 -mt-1 mb-5 aspect-[16/10] overflow-hidden">
              <Image
                src={`/dishes/${detail.slug}-800.webp`}
                alt={detail.name}
                fill
                sizes="(max-width: 640px) 100vw, 520px"
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(16,18,22,.96),rgba(16,18,22,.1)_60%)]" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <DietMark diet={detail.diet} />
                  <span className="text-[11px] text-cream-2">{detail.station.toLowerCase()} station</span>
                </div>
                <h2 className="mt-2 text-[24px] leading-tight" style={{ fontFamily: "var(--font-display)" }}>{detail.name}</h2>
                <p className="mt-0.5 text-[13px] text-cream-2" lang="hi">{detail.nameHi}</p>
              </div>
              <p className="mono shrink-0 text-[18px]">{rupee(detail.pricePaise)}</p>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-cream-1">{detail.description}</p>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-[12px] border border-[var(--hairline)] p-3">
                <dt className="micro text-cream-2">Prep</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-cream-0">
                  <Clock size={12} strokeWidth={1.5} /> {detail.prepMinutes} min
                </dd>
              </div>
              <div className="rounded-[12px] border border-[var(--hairline)] p-3">
                <dt className="micro text-cream-2">Spice</dt>
                <dd className="mt-1 flex items-center gap-1 text-cream-0">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Flame key={i} size={12} strokeWidth={1.5} className={i < detail.spice ? "text-accent" : "text-cream-2/30"} />
                  ))}
                  <span className="ml-1">{["Mild", "Medium", "Hot", "Very hot"][detail.spice]}</span>
                </dd>
              </div>
              {JSON.parse(detail.allergens || "[]").length > 0 && (
                <div className="col-span-2 rounded-[12px] border border-[var(--hairline)] p-3">
                  <dt className="micro text-cream-2">Contains</dt>
                  <dd className="mt-1 text-cream-1">{(JSON.parse(detail.allergens) as string[]).join(" · ")}</dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              onClick={() => { add(detail); setDetail(null); }}
              disabled={!detail.available}
              className="btn btn-primary mt-6 w-full"
            >
              {detail.available ? `Add · ${rupee(detail.pricePaise)}` : "Aaj nahi hai"}
            </button>
          </div>
        )}
      </GlassSheet>

      {/* review order sheet */}
      <GlassSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Review order"
        description={`${diner.tableNumber} · ${count} ${count === 1 ? "item" : "items"}`}
        footer={
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[13px] text-cream-1">
              <span>Total incl. GST</span>
              <span className="mono text-[15px] text-cream-0">{rupee(subtotal + tax)}</span>
            </div>
            <button type="button" onClick={placeOrder} disabled={placing} className="btn btn-primary w-full">
              {placing ? "Bhej rahe hain…" : `Place order · ${rupee(subtotal + tax)}`}
            </button>
            <p className="text-center text-[10.5px] text-cream-2">
              {diner.tableNumber} ki taraf se kitchen ko jayega
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {dupeWarning.length > 0 && (
            <div className="rounded-[12px] border border-[rgba(232,164,85,.35)] bg-[rgba(232,164,85,.1)] p-3.5">
              <p className="text-[13px] text-[#f5dfc2]">
                {dupeWarning.map((d) => d.name).join(", ")} already order ho chuka hai
                {dupeWarning[0]?.guest ? ` (${dupeWarning[0].guest})` : ""}.
              </p>
              <p className="mt-1 text-[12px] text-cream-1">Phir bhi add karein ya cancel — aapki marzi.</p>
            </div>
          )}

          {lines.map((line) => {
            const item = menu.items.find((i) => i.id === line.itemId);
            if (!item) return null;
            return (
              <div key={line.itemId} className="flex gap-3 border-b border-[var(--hairline)] pb-3 last:border-0">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-white/5">
                  <Image src={`/dishes/${item.slug}-400.webp`} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13.5px] leading-snug text-cream-0">{item.name}</p>
                    <p className="mono shrink-0 text-[13px] text-cream-1">{rupee((item.pricePaise * line.qty))}</p>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-full border border-[var(--hairline-strong)]">
                      <button type="button" onClick={() => step(line.itemId, -1)} aria-label={`Remove one ${item.name}`} className="grid h-7 w-7 place-items-center text-cream-1">
                        <Minus size={12} strokeWidth={2} />
                      </button>
                      <span className="mono w-4 text-center text-[12px]">{line.qty}</span>
                      <button type="button" onClick={() => step(line.itemId, 1)} aria-label={`Add one ${item.name}`} className="grid h-7 w-7 place-items-center text-cream-1">
                        <Plus size={12} strokeWidth={2} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={line.notes}
                      maxLength={80}
                      onChange={(e) => setCart((prev) => ({ ...prev, [line.itemId]: { ...line, notes: e.target.value } }))}
                      placeholder="No onion…"
                      aria-label={`Note for ${item.name}`}
                      className="w-[46%] rounded-md border border-transparent bg-white/[.04] px-2 py-1 text-[11.5px] text-cream-1 placeholder:text-cream-2/70 focus:border-[rgba(232,164,85,.4)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-1">
            <GlassTextarea
              rows={2}
              maxLength={140}
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Kitchen ke liye note — allergies, timing, kuch bhi"
              aria-label="Note for the kitchen"
              className="text-[13px]"
            />
          </div>

          <div className="mt-1 space-y-1.5 border-t border-[var(--hairline)] pt-3 text-[12.5px]">
            <Row label="Subtotal" value={rupee(subtotal)} />
            <Row label="GST 5%" value={rupee(tax)} />
            <div className="flex items-center justify-between pt-1 text-[14px] text-cream-0">
              <span>Total</span>
              <span className="mono">{rupee(subtotal + tax)}</span>
            </div>
          </div>
        </div>
      </GlassSheet>

      {/* second-guest name prompt */}
      <GlassSheet open={namePrompt} onClose={() => saveName(true)} title="Aapka naam?" description="Staff ticket pe dikhega — optional hai.">
        <input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveName()}
          placeholder="Rahul"
          maxLength={24}
          aria-label="Your name"
          className="field"
        />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => saveName(true)} className="btn btn-ghost flex-1">Skip</button>
          <button type="button" onClick={() => saveName()} className="btn btn-primary flex-1">Save</button>
        </div>
      </GlassSheet>

    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-cream-1">
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

function DishRow({
  item,
  qty,
  onAdd,
  onOpen,
  onStep,
}: {
  item: MenuItemView;
  qty: number;
  onAdd: () => void;
  onOpen: () => void;
  onStep: (id: string, delta: number) => void;
}) {
  return (
    <article
      className={cn(
        "group relative flex gap-3 rounded-[14px] border border-[var(--hairline)] bg-white/[.022] p-2.5 transition-colors",
        item.available ? "hover:border-[var(--hairline-strong)] hover:bg-white/[.045]" : "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open details for ${item.name}`}
        className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[11px] bg-white/[.05]"
      >
        <Image
          src={`/dishes/${item.slug}-400.webp`}
          alt=""
          width={84}
          height={84}
          sizes="84px"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          unoptimized
        />
        {!item.available && (
          <span className="absolute inset-0 grid place-items-center bg-black/55 text-center text-[10px] font-medium leading-tight text-cream-0">
            Aaj<br />nahi hai
          </span>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <div className="flex items-start gap-1.5">
            <DietMark diet={item.diet} className="mt-[3px]" />
            <button type="button" onClick={onOpen} className="text-left">
              <h3 className="text-[14px] font-medium leading-tight tracking-[-0.01em] text-cream-0">{item.name}</h3>
              <p className="mt-0.5 text-[11px] text-cream-2" lang="hi">{item.nameHi}</p>
            </button>
          </div>
          <p className="mt-1 line-clamp-2 pr-2 text-[11.5px] leading-snug text-cream-2">{item.description}</p>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="mono text-[13.5px] text-cream-0">{item.available ? rupee(item.pricePaise) : <span className="text-[11.5px] text-cream-2">Aaj nahi hai</span>}</span>
            {item.spice >= 2 && item.available && (
              <Flame size={11} strokeWidth={2} className="text-accent/70" aria-label="Spicy" />
            )}
          </div>
          {item.available && (
            qty > 0 ? (
              <div className="flex items-center gap-0.5 rounded-full border border-[rgba(232,164,85,.42)] bg-[rgba(232,164,85,.12)]">
                <button type="button" onClick={() => onStep(item.id, -1)} aria-label={`Remove one ${item.name}`} className="grid h-8 w-8 place-items-center text-[#f5dfc2]">
                  <Minus size={13} strokeWidth={2} />
                </button>
                <span className="mono min-w-3 text-center text-[12.5px] text-[#f5dfc2]">{qty}</span>
                <button type="button" onClick={() => onStep(item.id, 1)} aria-label={`Add one ${item.name}`} className="grid h-8 w-8 place-items-center text-[#f5dfc2]">
                  <Plus size={13} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                aria-label={`Add ${item.name}`}
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--hairline-strong)] text-cream-0 transition-colors hover:border-[rgba(232,164,85,.55)] hover:bg-[rgba(232,164,85,.14)]"
              >
                <Plus size={14} strokeWidth={2} />
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}
