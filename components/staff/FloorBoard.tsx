"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, BellRing, ChefHat, CircleAlert, LogOut, Receipt, Sparkles, UtensilsCrossed, Users,
} from "lucide-react";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { rupee } from "@/lib/utils/money";
import { countdown, duration, clockTime, shortDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

type FloorTable = {
  id: string;
  number: string;
  section: string;
  seats: number;
  state: "FREE" | "SEATED" | "ORDERING" | "DINING" | "BILL_REQUESTED" | "CLEANING";
  stateSince: number;
  guests: Array<{ id: string; name: string | null }>;
  sessionId: string | null;
  runningSubtotalPaise: number;
  oldestActiveAt: number | null;
  openOrderCount: number;
};

type QueueTask = {
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

type FloorPayload = {
  serverNow: number;
  staff: { id: string; name: string; role: string; section: string | null };
  tasks: QueueTask[];
  tables: FloorTable[];
  sections: string[];
  activeSection: string | null;
  stats: { breached: number; openCalls: number; openOrders: number; vipManagerAlert: boolean };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ ok: boolean; data: FloorPayload }>);

const STATE_COPY: Record<FloorTable["state"], { word: string; tone: string; ring: string }> = {
  FREE: { word: "free", tone: "text-cream-2", ring: "border-dashed border-[rgba(255,255,255,.16)]" },
  SEATED: { word: "seated", tone: "text-cream-1", ring: "border-[rgba(247,242,232,.2)]" },
  ORDERING: { word: "ordering", tone: "text-accent", ring: "border-[rgba(232,164,85,.5)]" },
  DINING: { word: "dining", tone: "text-[#a9e2c9]", ring: "border-[rgba(127,209,174,.45)]" },
  BILL_REQUESTED: { word: "bill asked", tone: "text-[#f0b6a0]", ring: "border-[rgba(196,83,43,.55)]" },
  CLEANING: { word: "cleaning", tone: "text-cream-2", ring: "border-[rgba(255,255,255,.16)]" },
};

export function FloorBoard({
  staff,
  initialFloor,
  bannerAlert,
}: {
  staff: { id: string; name: string; role: string; section: string | null };
  initialFloor: FloorPayload;
  bannerAlert: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { data } = useSWR<{ ok: boolean; data: FloorPayload }>("/api/staff/floor", fetcher, {
    refreshInterval: 2500,
    fallbackData: { ok: true, data: initialFloor },
    revalidateOnFocus: true,
  });
  const [now, setNow] = useState(initialFloor.serverNow);
  const [tab, setTab] = useState<"all" | string>(initialFloor.activeSection ?? "all");
  const [selected, setSelected] = useState<FloorTable | null>(null);
  const [rejecting, setRejecting] = useState<QueueTask | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectReason, setRejectReason] = useState("ITEM_UNAVAILABLE");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const floor = data?.ok ? data.data : initialFloor;
  const offset = floor.serverNow - Date.now();

  const visibleTables = useMemo(
    () => (tab === "all" ? floor.tables : floor.tables.filter((t) => t.section === tab)),
    [floor.tables, tab],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, FloorTable[]>();
    for (const t of visibleTables) {
      if (!map.has(t.section)) map.set(t.section, []);
      map.get(t.section)!.push(t);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleTables]);

  const tasks = floor.tasks;
  const breached = tasks.filter((t) => t.slaDueAt && now + offset > t.slaDueAt).length;

  const act = async (task: QueueTask, action: "accept" | "serve" | "ack" | "bill") => {
    setBusy(task.id);
    const endpoints: Record<string, string> = {
      accept: `/api/staff/orders/${task.orderId}/accept`,
      serve: `/api/staff/orders/${task.orderId}/serve`,
      ack: `/api/staff/calls/${task.callId}/resolve`,
      bill: `/api/staff/bills/from-session`,
    };
    const body = action === "bill" ? JSON.stringify({ tableId: task.tableId }) : "{}";
    const response = await fetch(endpoints[action]!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const json = (await response.json()) as { ok: boolean; message?: string; data?: { redirect?: string; stations?: string[]; billId?: string } };
    setBusy(null);
    if (!json.ok) {
      setToast(json.message ?? "Nahi ho paya");
      return;
    }
    if (json.data?.redirect) {
      router.push(json.data.redirect);
      return;
    }
    if (action === "accept") {
      setToast(`Order accepted · KOT sent to ${(json.data?.stations ?? []).join(", ")}`);
    } else if (action === "serve") {
      setToast(`Served · ${task.tableNumber} table kha raha hai`);
    } else if (action === "ack") {
      setToast(`${task.tableNumber} · call resolve ho gaya`);
    } else {
      setToast("Bill taiyaar hai");
    }
    setSelected(null);
    void data;
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting.id);
    const response = await fetch(`/api/staff/orders/${rejecting.orderId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason, note: rejectNote || null }),
    });
    const json = (await response.json()) as { ok: boolean; message?: string };
    setBusy(null);
    setRejecting(null);
    setRejectNote("");
    setToast(json.ok ? "Order reject hua · table ko reason dikh gaya" : (json.message ?? "Reject nahi ho paya"));
  };

  const markTableReady = async (table: FloorTable) => {
    setBusy(`table-${table.id}`);
    const response = await fetch(`/api/staff/tables/${table.id}/ready`, { method: "POST" });
    const json = (await response.json()) as { ok: boolean; message?: string };
    setBusy(null);
    setSelected(null);
    setToast(json.ok ? `${table.number} free ho gaya` : (json.message ?? "Nahi ho paya"));
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1240px] px-3 pb-16 sm:px-6">
      {/* shift bar */}
      <header className="sticky top-0 z-30 -mx-3 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))] sm:-mx-6 sm:px-6">
        <div className="glass-e3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border-x-0 border-t-0 px-3.5 py-2.5 sm:rounded-[18px] sm:border-x sm:border-t">
          <div className="flex items-center gap-2">
            <span className="hidden h-7 w-[1px] bg-[var(--hairline-strong)] sm:block" aria-hidden="true" />
            <div>
              <p className="text-[13px] leading-tight text-cream-0">
                {staff.name}
                <span className="ml-1.5 text-[11px] text-cream-2">{staff.role.toLowerCase()}</span>
              </p>
              <p className="text-[11px] leading-tight text-cream-2">{shortDate(now + offset)} · {clockTime(now + offset)}</p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-[3px] text-[10px] uppercase tracking-[.08em] text-cream-1">
            {staff.section ? `Section ${staff.section}` : "Whole floor"}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-cream-2">
              <span className="live-dot" data-idle={hidden} aria-hidden="true" />
              {hidden ? "paused" : "live"}
            </span>
            <span className="mono hidden text-[11px] text-cream-2 sm:inline">updated {Math.max(0, Math.round((now - (floor.serverNow - 2500)) / 1000))}s ago</span>
            <div className="flex items-center gap-1 rounded-full border border-[rgba(196,83,43,.4)] bg-[rgba(196,83,43,.12)] px-2 py-[3px]" aria-live="polite" aria-label={`${breached} tasks past SLA`}>
              <CircleAlert size={11} strokeWidth={2} className="text-[#f0b6a0]" />
              <span className="mono text-[11px] text-[#f0b6a0]">{breached}</span>
            </div>
            <Link href="/staff/login" className="btn btn-quiet h-8 px-2 text-[11px]" aria-label="Sign out">
              <LogOut size={13} strokeWidth={1.6} />
            </Link>
          </div>
        </div>
      </header>

      {bannerAlert && (
        <div role="alert" className="mt-3 flex items-start gap-3 rounded-[14px] border border-[rgba(196,83,43,.5)] bg-[rgba(196,83,43,.14)] px-4 py-3">
          <BellRing size={16} strokeWidth={1.6} className="mt-0.5 shrink-0 text-[#f0b6a0]" aria-hidden="true" />
          <div>
            <p className="text-[13px] text-cream-0">Manager alert</p>
            <p className="mt-0.5 text-[12px] leading-snug text-cream-1">{bannerAlert}</p>
          </div>
          <Link href="/admin/reviews" className="btn btn-quiet ml-auto h-8 shrink-0 px-2 text-[12px]">Open</Link>
        </div>
      )}

      {/* action queue — the hero */}
      <section aria-labelledby="queue-heading" className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h1 id="queue-heading" className="title text-cream-0">Action queue</h1>
          <p className="text-[12px] text-cream-2" aria-live="polite">
            {tasks.length === 0 ? "sab clear" : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} · SLA pehle`}
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="glass-e1 mt-3 flex items-center gap-3 px-4 py-5">
            <Sparkles size={16} strokeWidth={1.5} className="text-cream-2" aria-hidden="true" />
            <div>
              <p className="text-[13.5px] text-cream-1">Queue khali hai.</p>
              <p className="mt-0.5 text-[12px] text-cream-2">Jab koi order aayega, yahan pehla dikhega.</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {tasks.map((task) => {
                const sla = task.slaDueAt ? countdown(task.slaDueAt, now + offset) : null;
                const remaining = task.slaDueAt ? task.slaDueAt - (now + offset) : null;
                const pct = remaining !== null ? Math.min(100, Math.max(0, ((90_000 - remaining) / 90_000) * 100)) : null;
                const state = sla?.over ? "over" : pct !== null && pct > 50 ? "warn" : "ok";
                return (
                  <motion.article
                    key={task.id}
                    layout={!reduce}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16, transition: { duration: 0.18 } }}
                    transition={{ duration: reduce ? 0.1 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "glass-e1 flex items-start gap-3 overflow-hidden p-3.5",
                      state === "over" && "border-[rgba(196,83,43,.5)]",
                      state === "warn" && "border-[rgba(232,164,85,.42)]",
                    )}
                  >
                    <div className="relative grid h-11 w-11 shrink-0 place-items-center">
                      {pct !== null && (
                        <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
                          <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2.5" />
                          <circle
                            cx="22" cy="22" r="19" fill="none" strokeWidth="2.5"
                            stroke={state === "over" ? "#C4532B" : state === "warn" ? "#E8A455" : "#7FD1AE"}
                            strokeDasharray={2 * Math.PI * 19}
                            strokeDashoffset={2 * Math.PI * 19 * (1 - (pct / 100))}
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                      <span className="mono z-10 text-[10px] text-cream-1">{task.slaDueAt ? sla?.text : "—"}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-[5px] border border-[var(--hairline-strong)] px-1.5 py-[1px] text-[10.5px] tracking-[.04em] text-cream-1">
                          {task.tableNumber}
                        </span>
                        <span className={cn("text-[11px]", state === "over" ? "text-[#f0b6a0]" : "text-cream-2")}>
                          {kindLabel(task.kind)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13.5px] leading-snug text-cream-0">{task.title}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-cream-2">{task.detail}</p>
                      <div className="mt-2.5 flex items-center gap-2">
                        {task.kind === "ORDER_ACCEPT" && (
                          <>
                            <button type="button" onClick={() => act(task, "accept")} disabled={busy === task.id} className="btn btn-primary h-9 px-3.5 text-[12px]">
                              Accept
                            </button>
                            <button type="button" onClick={() => setRejecting(task)} className="btn btn-ghost h-9 px-3 text-[12px]">Reject</button>
                          </>
                        )}
                        {task.kind === "READY_TO_SERVE" && (
                          <button type="button" onClick={() => act(task, "serve")} disabled={busy === task.id} className="btn btn-primary h-9 px-3.5 text-[12px]">
                            Mark served
                          </button>
                        )}
                        {(task.kind === "WAITER_CALL" || task.kind === "BILL_REQUEST") && (
                          <>
                            <button type="button" onClick={() => act(task, task.kind === "BILL_REQUEST" ? "bill" : "ack")} disabled={busy === task.id} className="btn btn-primary h-9 px-3.5 text-[12px]">
                              {task.kind === "BILL_REQUEST" ? "Open bill" : "On my way"}
                            </button>
                            {task.kind === "BILL_REQUEST" && (
                              <button type="button" onClick={() => act(task, "ack")} className="btn btn-ghost h-9 px-3 text-[12px]">Done</button>
                            )}
                          </>
                        )}
                        {task.kind === "OVERDUE_KITCHEN" && (
                          <Link href="/kitchen" className="btn btn-ghost h-9 px-3 text-[12px]">
                            Kitchen <ArrowRight size={12} strokeWidth={2} />
                          </Link>
                        )}
                        {task.orderId && task.kind !== "ORDER_ACCEPT" && (
                          <Link href={`/staff/order/${task.orderId}`} className="btn btn-quiet h-9 px-2 text-[12px]">Details</Link>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* floor map */}
      <section aria-labelledby="floor-heading" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="floor-heading" className="title text-cream-0">Floor</h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn("rounded-full border px-2.5 py-1 text-[11.5px]", tab === "all" ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.13)] text-[#f5dfc2]" : "border-[var(--hairline)] text-cream-1")}
            >
              All
            </button>
            {floor.sections.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTab(s)}
                className={cn("rounded-full border px-2.5 py-1 text-[11.5px]", tab === s ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.13)] text-[#f5dfc2]" : "border-[var(--hairline)] text-cream-1")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-4">
          {grouped.map(([section, rows]) => (
            <div key={section}>
              <p className="micro mb-2 text-cream-2">Section {section}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {rows.map((table) => {
                  const copy = STATE_COPY[table.state];
                  const elapsed = table.oldestActiveAt ? now + offset - table.oldestActiveAt : 0;
                  const agePct = Math.min(100, (elapsed / (90 * 60_000)) * 100);
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelected(table)}
                      className={cn(
                        "relative min-h-[104px] overflow-hidden rounded-[14px] border bg-white/[.022] p-2.5 text-left transition-transform duration-200 hover:-translate-y-[2px] hover:bg-white/[.05] focus-visible:-translate-y-[2px]",
                        copy.ring,
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[15px] tracking-[-.01em] text-cream-0">{table.number}</span>
                        <span className="flex items-center gap-1 text-[10px] text-cream-2">
                          <Users size={9} strokeWidth={2} /> {table.seats}
                        </span>
                      </div>
                      <p className={cn("mt-1 flex items-center gap-1.5 text-[11px]", copy.tone)}>
                        <span className="dot" style={{ background: "currentColor" }} aria-hidden="true" />
                        {copy.word}
                      </p>
                      {table.state !== "FREE" && (
                        <p className="mono mt-0.5 text-[11px] text-cream-2">{duration(elapsed)}</p>
                      )}
                      {table.runningSubtotalPaise > 0 && (
                        <p className="mono mt-auto pt-1 text-[11.5px] text-cream-1">{rupee(table.runningSubtotalPaise)}</p>
                      )}
                      {table.state === "CLEANING" && (
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.07]" style={{ background: "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 7px)" }} />
                      )}
                      {table.state !== "FREE" && (
                        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--hairline)]">
                          <span
                            className={cn("block h-full", table.state === "BILL_REQUESTED" ? "bg-[#C4532B]" : table.state === "DINING" ? "bg-[#7FD1AE]" : "bg-[#E8A455]")}
                            style={{ width: `${agePct}%` }}
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status" aria-live="polite">
          <div className="glass-e3 rounded-[12px] px-4 py-2.5 text-[12.5px] text-cream-0">{toast}</div>
        </div>
      )}

      {/* table sheet */}
      <GlassSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.number} · ${selected.seats} seats` : undefined}
        description={selected ? `Section ${selected.section} · ${STATE_COPY[selected.state].word}` : undefined}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-2.5 text-[12px]">
              <div className="rounded-[11px] border border-[var(--hairline)] p-3">
                <dt className="micro text-cream-2">In state</dt>
                <dd className="mono mt-1 text-cream-0">{duration(now + offset - selected.stateSince)}</dd>
              </div>
              <div className="rounded-[11px] border border-[var(--hairline)] p-3">
                <dt className="micro text-cream-2">Running</dt>
                <dd className="mono mt-1 text-cream-0">{rupee(selected.runningSubtotalPaise)}</dd>
              </div>
            </dl>

            {selected.guests.length > 0 && (
              <div>
                <p className="micro mb-1.5 text-cream-2">Guests</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.guests.map((g) => (
                    <span key={g.id} className="chip cursor-default">
                      {g.name ?? `Guest ${selected.guests.indexOf(g) + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {selected.state === "CLEANING" && (
                <button type="button" onClick={() => markTableReady(selected)} disabled={busy === `table-${selected.id}`} className="btn btn-primary w-full">
                  <UtensilsCrossed size={14} strokeWidth={1.6} /> Table ready
                </button>
              )}
              {selected.sessionId && selected.runningSubtotalPaise > 0 && (
                <Link href={`/staff/bill/session/${selected.sessionId}`} className="btn btn-ghost w-full">
                  <Receipt size={14} strokeWidth={1.6} /> Open bill
                </Link>
              )}
              <button type="button" onClick={() => { setSelected(null); router.push("/kitchen"); }} className="btn btn-quiet w-full text-[13px]">
                <ChefHat size={13} strokeWidth={1.6} /> Kitchen dekhein
              </button>
            </div>
            <p className="text-[11px] leading-snug text-cream-2">
              Merge aur shift table abhi manual hai — manager ko bulaayein. Audit log mein entry jayegi.
            </p>
          </div>
        )}
      </GlassSheet>

      {/* reject sheet */}
      <GlassSheet
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Order reject karein"
        description="Customer ko yahi reason dikhega — clear rakhein."
        footer={
          <button type="button" onClick={reject} disabled={busy === rejecting?.id} className="btn btn-danger w-full">
            Reject order
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          {[
            { key: "ITEM_UNAVAILABLE", label: "Item khatam" },
            { key: "KITCHEN_CLOSED", label: "Kitchen closed" },
            { key: "TABLE_MISMATCH", label: "Table mismatch" },
            { key: "DUPLICATE", label: "Duplicate" },
            { key: "OTHER", label: "Kuch aur" },
          ].map((reason) => (
            <button
              key={reason.key}
              type="button"
              onClick={() => setRejectReason(reason.key)}
              className="chip"
              data-on={rejectReason === reason.key}
            >
              {reason.label}
            </button>
          ))}
        </div>
        <textarea
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          maxLength={120}
          rows={3}
          placeholder="Note (optional) — jaise ‘Paneer khatam hai, malai tikka try karein’"
          className="field mt-3 text-[13px]"
          aria-label="Rejection note"
        />
      </GlassSheet>
    </div>
  );
}

function kindLabel(kind: QueueTask["kind"]) {
  switch (kind) {
    case "ORDER_ACCEPT": return "new order";
    case "WAITER_CALL": return "waiter called";
    case "BILL_REQUEST": return "bill asked";
    case "READY_TO_SERVE": return "ready";
    case "OVERDUE_KITCHEN": return "overdue";
    default: return "";
  }
}
