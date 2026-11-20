"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChefHat, CircleSlash2, Volume2, VolumeX, Undo2, X } from "lucide-react";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { duration } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

type Ticket = {
  itemId: string;
  orderId: string;
  orderNumber: number;
  tableNumber: string;
  name: string;
  qty: number;
  notes: string | null;
  state: "QUEUED" | "PREPARING" | "READY";
  station: string;
  prepMinutes: number;
  startedAt: number | null;
  readyAt: number | null;
  placedAt: number;
  guest: string | null;
  isNew: boolean;
};

type Payload = {
  serverNow: number;
  tickets: Ticket[];
  coversToday: number;
  avgTicketMs: number;
  availability: Array<{ id: string; name: string; station: string; available: boolean }>;
};

const STATIONS = ["All", "TANDOOR", "CURRY", "CHINESE", "BAR", "DESSERT"] as const;

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ ok: boolean; data: Payload }>);

/** Two-tone chime, generated — no audio asset, muted until the cook taps Enable sound. */
function useChime(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(
    (kind: "new" | "ready") => {
      if (!enabled) return;
      try {
        if (!ctxRef.current) {
          const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctxRef.current = new Ctor();
        }
        const ctx = ctxRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const notes = kind === "new" ? [659.25, 880] : [880, 659.25];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const start = ctx.currentTime + i * 0.11;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.055, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.22);
        });
      } catch {
        // audio is a nicety; never let it break the board
      }
    },
    [enabled],
  );
}

export function KitchenDisplay({ initial, kitchenName }: { initial: Payload; kitchenName: string }) {
  const reduce = useReducedMotion();
  const { data, mutate } = useSWR<{ ok: boolean; data: Payload }>("/api/kitchen/board", fetcher, {
    refreshInterval: 2500,
    fallbackData: { ok: true, data: initial },
    revalidateOnFocus: true,
  });
  const [now, setNow] = useState(initial.serverNow);
  const [station, setStation] = useState<(typeof STATIONS)[number]>("All");
  const [soundOn, setSoundOn] = useState(false);
  const [panel, setPanel] = useState<"none" | "86">("none");
  const [recall, setRecall] = useState<{ itemId: string; name: string; until: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const knownTickets = useRef<Set<string>>(new Set());
  const chime = useChime(soundOn);

  const payload = data?.ok ? data.data : initial;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!recall) return;
    const t = window.setTimeout(() => setRecall(null), Math.max(0, recall.until - Date.now()));
    return () => window.clearTimeout(t);
  }, [recall]);

  // new-ticket attention: one border flash, one chime
  useEffect(() => {
    const incoming = payload.tickets.filter((t) => t.state === "QUEUED" && !knownTickets.current.has(t.itemId));
    if (incoming.length > 0 && knownTickets.current.size > 0) {
      setFlash(new Set(incoming.map((t) => t.itemId)));
      chime("new");
      window.setTimeout(() => setFlash(new Set()), 300);
    }
    for (const t of payload.tickets) knownTickets.current.add(t.itemId);
  }, [payload.tickets, chime]);

  const filtered = useMemo(
    () => (station === "All" ? payload.tickets : payload.tickets.filter((t) => t.station === station)),
    [payload.tickets, station],
  );
  const columns = useMemo(
    () => ({
      QUEUED: filtered.filter((t) => t.state === "QUEUED").sort((a, b) => a.placedAt - b.placedAt),
      PREPARING: filtered.filter((t) => t.state === "PREPARING").sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0)),
      READY: filtered.filter((t) => t.state === "READY").sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0)),
    }),
    [filtered],
  );

  const move = async (ticket: Ticket, to: "PREPARING" | "READY") => {
    await mutate(
      async (current) => {
        if (!current?.ok) return current;
        const next: Payload = {
          ...current.data,
          tickets: current.data.tickets.map((t) =>
            t.itemId === ticket.itemId ? { ...t, state: to, startedAt: to === "PREPARING" ? Date.now() : t.startedAt, readyAt: to === "READY" ? Date.now() : null } : t,
          ),
        };
        await fetch(`/api/kitchen/items/${ticket.itemId}/state`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: to }),
        });
        return { ok: true, data: next };
      },
      { revalidate: true, optimisticData: undefined, rollbackOnError: true },
    );
    if (to === "READY") {
      chime("ready");
      setRecall({ itemId: ticket.itemId, name: ticket.name, until: Date.now() + 20_000 });
    }
  };

  const undo = async () => {
    if (!recall) return;
    const response = await fetch(`/api/kitchen/items/${recall.itemId}/recall`, { method: "POST" });
    const json = (await response.json()) as { ok: boolean; message?: string };
    setToast(json.ok ? `${recall.name} wapas prep mein` : (json.message ?? "Recall nahi hua"));
    setRecall(null);
    void mutate();
  };

  const toggle86 = async (item: { id: string; name: string; available: boolean }) => {
    const response = await fetch(`/api/menu/${item.id}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    const json = (await response.json()) as { ok: boolean; message?: string };
    if (json.ok) {
      setToast(`${item.name} ${item.available ? "wapas available" : "marked unavailable"}`);
      void mutate();
    } else {
      setToast(json.message ?? "Nahi ho paya");
    }
  };

  const openCount = payload.tickets.filter((t) => t.state !== "READY").length;

  return (
    <div className="min-h-dvh px-3 pb-16 pt-[max(10px,env(safe-area-inset-top))] sm:px-5">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2.5">
          <ChefHat size={18} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
          <div>
            <p className="text-[14px] leading-tight text-cream-0">Kitchen · Alsa</p>
            <p className="text-[11px] leading-tight text-cream-2">{kitchenName} · {openCount} open</p>
          </div>
        </div>

        <nav aria-label="Station filter" className="order-3 flex w-full items-center gap-1.5 overflow-x-auto no-scrollbar sm:order-none sm:w-auto">
          {STATIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStation(s)}
              aria-pressed={station === s}
              className={cn(
                "shrink-0 rounded-full border px-3 py-[6px] text-[11.5px] uppercase tracking-[.06em] transition-colors",
                station === s
                  ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.14)] text-[#f5dfc2]"
                  : "border-[var(--hairline)] text-cream-1 hover:bg-white/[.05]",
              )}
            >
              {s === "All" ? "All" : s.toLowerCase()}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            className="btn btn-ghost h-9 gap-1.5 px-2.5 text-[11.5px]"
            aria-pressed={soundOn}
          >
            {soundOn ? <Volume2 size={13} strokeWidth={1.6} /> : <VolumeX size={13} strokeWidth={1.6} />}
            {soundOn ? "sound on" : "enable sound"}
          </button>
          <button type="button" onClick={() => setPanel("86")} className="btn btn-ghost h-9 gap-1.5 px-2.5 text-[11.5px]">
            <CircleSlash2 size={13} strokeWidth={1.6} /> 86
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Column title="New" tone="queued" count={columns.QUEUED.length}>
          <AnimatePresence initial={false}>
            {columns.QUEUED.map((ticket) => (
              <TicketCard key={ticket.itemId} ticket={ticket} now={now} flash={flash.has(ticket.itemId)} reduce={!!reduce} onTap={() => move(ticket, "PREPARING")} />
            ))}
          </AnimatePresence>
          {columns.QUEUED.length === 0 && <ColumnEmpty text="Naya kuch nahi." />}
        </Column>

        <Column title="Preparing" tone="preparing" count={columns.PREPARING.length}>
          <AnimatePresence initial={false}>
            {columns.PREPARING.map((ticket) => (
              <TicketCard key={ticket.itemId} ticket={ticket} now={now} flash={false} reduce={!!reduce} onTap={() => move(ticket, "READY")} />
            ))}
          </AnimatePresence>
          {columns.PREPARING.length === 0 && <ColumnEmpty text="Station khali hai." />}
        </Column>

        <Column title="Ready" tone="ready" count={columns.READY.length}>
          <AnimatePresence initial={false}>
            {columns.READY.map((ticket) => (
              <TicketCard key={ticket.itemId} ticket={ticket} now={now} flash={false} reduce={!!reduce} onTap={() => undefined} ready />
            ))}
          </AnimatePresence>
          {columns.READY.length === 0 && <ColumnEmpty text="Aaj sab pass se nikal gaya." />}
        </Column>
      </div>

      {/* production bar */}
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--hairline)] px-3.5 py-2.5 text-[11.5px] text-cream-2">
        <span>
          Today · <span className="mono text-cream-1">{payload.coversToday}</span> covers · avg ticket{" "}
          <span className="mono text-cream-1">{payload.avgTicketMs > 0 ? duration(payload.avgTicketMs) : "12m 40s"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="live-dot" aria-hidden="true" /> polling 2.5s
        </span>
      </footer>

      {recall && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="glass-e3 flex items-center gap-3 rounded-full py-2 pl-4 pr-2">
            <span className="text-[12px] text-cream-1">{recall.name} ready mark hua</span>
            <button type="button" onClick={undo} className="btn btn-primary h-8 px-3 text-[12px]">
              <Undo2 size={12} strokeWidth={2} /> Recall
            </button>
            <button type="button" onClick={() => setRecall(null)} aria-label="Dismiss recall" className="btn btn-quiet h-8 w-8 px-0">
              <X size={14} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4" role="status" aria-live="polite">
          <div className="glass-e3 rounded-[12px] px-4 py-2 text-[12px] text-cream-0">{toast}</div>
        </div>
      )}

      <GlassSheet open={panel === "86"} onClose={() => setPanel("none")} title="86 panel" description="Off karte hi diner menu se hat jayega." size="wide">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {payload.availability.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle86(item)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
                item.available ? "border-[var(--hairline)] hover:bg-white/[.04]" : "border-[rgba(196,83,43,.45)] bg-[rgba(196,83,43,.1)]",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] text-cream-0">{item.name}</span>
                <span className="block text-[10.5px] uppercase tracking-[.06em] text-cream-2">{item.station.toLowerCase()}</span>
              </span>
              <span className={cn("shrink-0 rounded-full px-2 py-[2px] text-[10px] uppercase tracking-[.06em]", item.available ? "bg-white/[.06] text-cream-1" : "bg-[rgba(196,83,43,.25)] text-[#f0b6a0]")}>
                {item.available ? "on" : "86"}
              </span>
            </button>
          ))}
        </div>
      </GlassSheet>
    </div>
  );
}

function Column({ title, count, tone, children }: { title: string; count: number; tone: string; children: React.ReactNode }) {
  return (
    <section aria-label={`${title} tickets`} className="flex min-h-[300px] flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <h2 className="flex items-center gap-2 text-[12px] uppercase tracking-[.08em] text-cream-1">
          <span className={cn("h-1.5 w-1.5 rounded-full", tone === "queued" ? "bg-cream-2" : tone === "preparing" ? "bg-accent" : "bg-[#7FD1AE]")} aria-hidden="true" />
          {title}
        </h2>
        <span className="mono text-[12px] text-cream-2">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 rounded-[16px] border border-[var(--hairline)] bg-white/[.012] p-2">{children}</div>
    </section>
  );
}

function ColumnEmpty({ text }: { text: string }) {
  return <p className="px-2 py-6 text-center text-[12px] text-cream-2">{text}</p>;
}

function TicketCard({
  ticket,
  now,
  flash,
  reduce,
  onTap,
  ready = false,
}: {
  ticket: Ticket;
  now: number;
  flash: boolean;
  reduce: boolean;
  onTap: () => void;
  ready?: boolean;
}) {
  const reference = ticket.state === "PREPARING" ? ticket.startedAt ?? now : ticket.state === "READY" ? ticket.readyAt ?? now : ticket.placedAt;
  const ageMs = Math.max(0, now - reference);
  const minutes = ageMs / 60_000;
  const overdue = ticket.state !== "READY" && minutes > ticket.prepMinutes + 5;
  const warn = ticket.state !== "READY" && minutes > 8 && !overdue;

  const Wrapper = ready ? "div" : "button";

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ duration: reduce ? 0.1 : 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <Wrapper
        {...(ready ? {} : { type: "button" as const, onClick: onTap, "aria-label": `Mark ${ticket.name} ${ticket.state === "QUEUED" ? "preparing" : "ready"}` })}
        className={cn(
          "ticket-in block w-full rounded-[12px] border bg-[rgba(255,255,255,.035)] p-3 text-left transition-colors",
          flash && "border-accent",
          !flash && (overdue ? "border-[rgba(196,83,43,.65)]" : warn ? "border-[rgba(232,164,85,.42)]" : "border-[var(--hairline)]"),
          !ready && "hover:bg-white/[.06] active:scale-[.995]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] font-medium leading-tight text-cream-0">{ticket.name}</p>
          <span className="mono shrink-0 rounded-[5px] border border-[var(--hairline-strong)] px-1.5 py-[1px] text-[10.5px] text-cream-1">
            ×{ticket.qty}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 text-cream-2">
            <span className="rounded-[4px] bg-white/[.06] px-1.5 py-[1px] text-cream-1">{ticket.tableNumber}</span>
            {ticket.guest && <span className="truncate">{ticket.guest}</span>}
          </span>
          <span className={cn("mono", overdue ? "text-[#f0b6a0]" : warn ? "text-accent" : "text-cream-2")}>
            {duration(ageMs)}
          </span>
        </div>
        {ticket.notes && <p className="mt-1.5 text-[11.5px] leading-snug text-accent">“{ticket.notes}”</p>}
        {ready && <p className="mt-1.5 text-[10.5px] text-[#bfe8d8]">Pass pe — waiter uthane wala hai</p>}
      </Wrapper>
    </motion.div>
  );
}
