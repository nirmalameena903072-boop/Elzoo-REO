"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, Check, CircleDot, Clock, Receipt, Utensils } from "lucide-react";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { rupee } from "@/lib/utils/money";
import { duration } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

type ApiItem = {
  id: string;
  name: string;
  qty: number;
  notes: string | null;
  state: "QUEUED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  station: string;
  prepMinutes: number;
  startedAt: number | null;
  readyAt: number | null;
};

type ApiOrder = {
  order: {
    id: string;
    number: number;
    state: "PLACED" | "ACCEPTED" | "IN_KITCHEN" | "PREPARING" | "READY" | "SERVED" | "BILLED" | "PAID" | "CANCELLED" | "REJECTED";
    totalPaise: number;
    placedAt: number;
    acceptedAt: number | null;
    readyAt: number | null;
    servedAt: number | null;
    rejectReason: string | null;
    rejectNote: string | null;
    note: string | null;
  };
  serverNow: number;
  items: ApiItem[];
};

const STEPS = [
  { key: "PLACED", label: "Order mila", hint: "Kitchen ko bhej diya" },
  { key: "ACCEPTED", label: "Accept kiya", hint: "Ticket print ho gaya" },
  { key: "PREPARING", label: "Ban raha hai", hint: "Tandoor aur curry pe" },
  { key: "READY", label: "Ready", hint: "Waiter utha raha hai" },
  { key: "SERVED", label: "Serve ho gaya", hint: "Enjoy karein" },
  { key: "BILLED", label: "Bill bana", hint: "Payment ka time" },
  { key: "PAID", label: "Paid", hint: "Shukriya" },
] as const;

const REJECT_COPY: Record<string, string> = {
  ITEM_UNAVAILABLE: "Kuch items aaj khatam ho gaye the",
  KITCHEN_CLOSED: "Kitchen abhi band tha",
  TABLE_MISMATCH: "Table ka order match nahi hua",
  DUPLICATE: "Yeh duplicate order tha",
  OTHER: "Kitchen ne order nahi le paya",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ ok: boolean; data: ApiOrder }>);

export function OrderStatus({
  orderId,
  tableNumber,
  initial,
  alternatives,
  alreadyPaid,
}: {
  orderId: string;
  tableNumber: string;
  initial: { ok: boolean; data: ApiOrder };
  alternatives: Array<{ id: string; name: string; slug: string; pricePaise: number; prepMinutes: number }>;
  alreadyPaid: boolean;
}) {
  const reduce = useReducedMotion();
  const { data } = useSWR<{ ok: boolean; data: ApiOrder }>(`/api/orders/${orderId}`, fetcher, {
    refreshInterval: 2500,
    fallbackData: initial,
    revalidateOnFocus: true,
  });
  const [now, setNow] = useState(initial.data.serverNow);
  const [callOpen, setCallOpen] = useState(false);
  const [callState, setCallState] = useState<{ at: number; message: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const payload = data?.ok ? data.data : initial.data;
  const order = payload.order;
  const serverOffset = payload.serverNow - Date.now();

  const stepIndex = useMemo(() => {
    const map: Record<string, number> = { PLACED: 0, ACCEPTED: 1, IN_KITCHEN: 2, PREPARING: 2, READY: 3, SERVED: 4, BILLED: 5, PAID: 6 };
    return map[order.state] ?? 0;
  }, [order.state]);

  const eta = useMemo(() => {
    const open = payload.items.filter((i) => i.state !== "SERVED" && i.state !== "CANCELLED");
    if (open.length === 0) return null;
    const byStation = new Map<string, number>();
    for (const item of open) {
      const remaining = Math.max(0, item.prepMinutes - (item.startedAt ? (now + serverOffset - item.startedAt) / 60_000 : 0));
      byStation.set(item.station, (byStation.get(item.station) ?? 0) + remaining);
    }
    const slowest = Math.max(...byStation.values());
    const minutes = Math.max(5, Math.round(slowest));
    return { low: Math.max(5, minutes - 2), high: minutes + 3 };
  }, [payload.items, now, serverOffset]);

  const canCancel = order.state === "PLACED" && now + serverOffset - order.placedAt < 45_000;
  const secondsLeftToCancel = Math.max(0, 45 - Math.floor((now + serverOffset - order.placedAt) / 1000));

  const activeItem = payload.items.find((i) => i.state === "PREPARING");

  const callWaiter = async (reason: string) => {
    const response = await fetch("/api/waiter-calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber, reason }),
    });
    const json = (await response.json()) as { ok: boolean; data?: { message: string; createdAt: number }; message?: string };
    setCallState({ at: Date.now(), message: json.ok ? (json.data?.message ?? "Waiter ko bhej diya") : (json.message ?? "Nahi bhej paye") });
    setCallOpen(false);
  };

  const cancel = async () => {
    setCancelling(true);
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const json = (await response.json()) as { ok: boolean; message?: string };
    if (!json.ok) setCancelReason(json.message ?? "Cancel nahi ho paya");
    setCancelling(false);
  };

  if (order.state === "REJECTED") {
    return (
      <RejectedState
        order={order}
        alternatives={alternatives}
        tableNumber={tableNumber}
        reason={order.rejectReason ? REJECT_COPY[order.rejectReason] ?? "Kitchen ne order nahi le paya" : "Kitchen ne order nahi le paya"}
      />
    );
  }

  const paid = order.state === "PAID" || alreadyPaid;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] pb-32">
      <header className="sticky top-0 z-30 glass-e3 rounded-none border-x-0 border-t-0 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/t/${tableNumber}/menu`} className="btn btn-quiet -ml-2 h-9 px-2 text-[13px]">
            <ArrowLeft size={15} strokeWidth={1.5} />
            Menu
          </Link>
          <div className="text-right">
            <p className="text-[13px] text-cream-1">
              Order <span className="mono">#{order.number}</span>
            </p>
            <p className="text-[11px] text-cream-2">{tableNumber} · {rupee(order.totalPaise)}</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-5">
        <div aria-live="polite" className="min-h-[74px]">
          <h1 className="text-[26px] leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>
            {order.state === "PLACED" && "Kitchen ne dekha nahi abhi"}
            {order.state === "ACCEPTED" && "Order accept ho gaya"}
            {(order.state === "IN_KITCHEN" || order.state === "PREPARING") && "Khana ban raha hai"}
            {order.state === "READY" && "Ready — aa raha hai"}
            {order.state === "SERVED" && "Serve ho gaya"}
            {order.state === "BILLED" && "Bill taiyaar hai"}
            {order.state === "PAID" && "Paid. Shukriya."}
            {order.state === "CANCELLED" && "Order cancel ho gaya"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-snug text-cream-1">
            {order.state === "PLACED" && "Waiter 60 second mein pakad lega. Uske baad cancel nahi hoga."}
            {order.state === "ACCEPTED" && `KOT print ho gaya — ${new Set(payload.items.map((i) => i.station)).size} stations pe.`}
            {(order.state === "IN_KITCHEN" || order.state === "PREPARING") && activeItem &&
              `${activeItem.name} pe kaam chal raha hai.`}
            {(order.state === "IN_KITCHEN" || order.state === "PREPARING") && !activeItem && "Team lag gayi hai."}
            {order.state === "READY" && "Jo ready hai woh table pe pahunch raha hai."}
            {order.state === "SERVED" && "Kuch aur chahiye to ‘Call waiter’ dabayein."}
            {order.state === "BILLED" && "Bill dekh lein aur pay kar dein — 30 second ka kaam."}
            {order.state === "PAID" && "Review likhne ka time hai — 10 second lagenge."}
            {order.state === "CANCELLED" && "Koi paisa nahi kata. Fresh order kar sakte hain."}
          </p>
        </div>

        {eta && !paid && (
          <div className="mt-4 flex items-center gap-2.5 rounded-[12px] border border-[var(--hairline)] bg-white/[.03] px-3.5 py-2.5">
            <Clock size={14} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
            <p className="text-[12.5px] text-cream-1">
              Live ETA <span className="mono text-cream-0">~{eta.low}–{eta.high} min</span>
              <span className="text-cream-2"> · slowest station se</span>
            </p>
          </div>
        )}

        {/* timeline */}
        <ol className="mt-6 flex flex-col" aria-label="Order progress">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li key={step.key} className="relative flex gap-3.5 pb-5 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-[9px] top-5 h-full w-px",
                      done ? "bg-[rgba(232,164,85,.5)]" : "bg-[var(--hairline)]",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-0.5 grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border",
                    done && "border-[rgba(232,164,85,.6)] bg-[rgba(232,164,85,.18)] text-accent",
                    current && "border-accent bg-accent text-[#1a1206]",
                    !done && !current && "border-[var(--hairline-strong)] bg-transparent text-transparent",
                  )}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : current ? <CircleDot size={11} strokeWidth={3} /> : <span className="h-1 w-1 rounded-full bg-cream-2/50" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[13.5px] leading-tight",
                      current ? "text-cream-0" : done ? "text-cream-1" : "text-cream-2/70",
                    )}
                    style={current && !reduce ? { animation: "none" } : undefined}
                  >
                    {step.label}
                    {current && <span className="live-dot ml-2 align-middle" aria-hidden="true" />}
                  </p>
                  {(current || done) && <p className="mt-0.5 text-[11.5px] text-cream-2">{step.hint}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* item-level detail — the part that is actually useful */}
        <section className="mt-6" aria-labelledby="items-heading">
          <h2 id="items-heading" className="micro mb-2.5 text-cream-2">
            Aapki dishes
          </h2>
          <div className="glass-e1 divide-y divide-[var(--hairline)] p-1.5">
            {payload.items.map((item) => {
              const delayed = item.state === "PREPARING" && item.startedAt && now + serverOffset - item.startedAt > (item.prepMinutes + 5) * 60_000;
              return (
                <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13.5px] text-cream-0">
                      <span className="mono shrink-0 text-[11px] text-cream-2">×{item.qty}</span>
                      <span className={item.state === "CANCELLED" ? "line-through text-cream-2" : ""}>{item.name}</span>
                    </p>
                    {item.notes && <p className="mt-0.5 pl-6 text-[11.5px] text-accent/90">{item.notes}</p>}
                    {delayed && (
                      <p className="mt-1 pl-6 text-[11.5px] text-[#f0b6a0]">
                        Thoda time lag raha hai — extra 5 min
                      </p>
                    )}
                  </div>
                  <ItemChip state={item.state} startedAt={item.startedAt} now={now + serverOffset} prep={item.prepMinutes} />
                </div>
              );
            })}
          </div>
          {order.note && (
            <p className="mt-2.5 px-1 text-[11.5px] leading-snug text-cream-2">Kitchen note: “{order.note}”</p>
          )}
        </section>

        {canCancel && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-[12px] border border-[var(--hairline)] px-3.5 py-3">
            <p className="text-[12px] text-cream-1">
              Galti ho gayi? <span className="mono text-cream-0">{secondsLeftToCancel}s</span> mein cancel ho sakta hai.
            </p>
            <button type="button" onClick={cancel} disabled={cancelling} className="text-[12px] text-[#f0b6a0] underline underline-offset-4">
              Cancel
            </button>
          </div>
        )}
        {cancelReason && <p className="mt-3 text-[12px] text-[#f0b6a0]">{cancelReason}</p>}

        {callState && (
          <div className="mt-4 rounded-[12px] border border-[rgba(232,164,85,.35)] bg-[rgba(232,164,85,.09)] px-3.5 py-3">
            <p className="text-[12.5px] text-[#f5dfc2]">{callState.message}</p>
            <p className="mt-0.5 text-[11px] text-cream-2">
              {Math.floor((now - callState.at) / 1000) > 75 ? "Thoda zyada ho gaya — manager ko bhi dikh raha hai." : "SLA 90 second hai."}
            </p>
          </div>
        )}

        {/* actions */}
        <div className="mt-7 flex flex-col gap-2.5">
          {paid ? (
            <Link href={`/t/${tableNumber}/review`} className="btn btn-primary w-full">
              <Receipt size={15} strokeWidth={1.6} />
              Review likhein
            </Link>
          ) : (
            <Link href={`/t/${tableNumber}/bill`} className="btn btn-primary w-full">
              <Receipt size={15} strokeWidth={1.6} />
              {order.state === "BILLED" ? "Bill dekh ke pay karein" : "Bill maangein"}
            </Link>
          )}
          <button type="button" onClick={() => setCallOpen(true)} className="btn btn-ghost w-full">
            <Utensils size={14} strokeWidth={1.6} />
            Call waiter
          </button>
          <Link href={`/t/${tableNumber}/menu`} className="btn btn-quiet w-full text-[13px]">
            Add more items
          </Link>
        </div>
      </main>

      <GlassSheet open={callOpen} onClose={() => setCallOpen(false)} title="Waiter ko bulayein" description="Ek tap — table number khud chala jayega.">
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "BILL", label: "Bill laao" },
            { key: "WATER", label: "Paani" },
            { key: "PLATE", label: "Extra plate" },
            { key: "CLEAN", label: "Table saaf karo" },
            { key: "ASSIST", label: "Baby chair" },
            { key: "OTHER", label: "Kuch aur" },
          ].map((reason) => (
            <button
              key={reason.key}
              type="button"
              onClick={() => callWaiter(reason.key)}
              className="btn btn-ghost h-12 justify-start px-4 text-[13px]"
            >
              {reason.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-cream-2">Ek active call per table har 90 second — dobara dabane pe wahi call dikhega.</p>
      </GlassSheet>
    </div>
  );
}

function ItemChip({ state, startedAt, now, prep }: { state: ApiItem["state"]; startedAt: number | null; now: number; prep: number }) {
  if (state === "SERVED") {
    return <span className="shrink-0 rounded-full border border-[rgba(127,209,174,.35)] bg-[rgba(127,209,174,.1)] px-2 py-[3px] text-[10.5px] text-[#bfe8d8]">served</span>;
  }
  if (state === "READY") {
    return (
      <span className="shrink-0 rounded-full border border-[rgba(127,209,174,.45)] bg-[rgba(127,209,174,.16)] px-2 py-[3px] text-[10.5px] text-[#d5f2e6]">
        ✓ ready
      </span>
    );
  }
  if (state === "CANCELLED") {
    return <span className="shrink-0 text-[10.5px] text-cream-2">cancelled</span>;
  }
  if (state === "PREPARING") {
    const remaining = Math.max(0, Math.round(prep - (startedAt ? (now - startedAt) / 60_000 : 0)));
    return <span className="mono shrink-0 text-[10.5px] text-accent">~{remaining} min</span>;
  }
  return <span className="shrink-0 text-[10.5px] text-cream-2">queued</span>;
}

function RejectedState({
  order,
  alternatives,
  tableNumber,
  reason,
}: {
  order: ApiOrder["order"];
  alternatives: Array<{ id: string; name: string; slug: string; pricePaise: number; prepMinutes: number }>;
  tableNumber: string;
  reason: string;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] px-4 pb-24 pt-[max(16px,env(safe-area-inset-top))]">
      <Link href={`/t/${tableNumber}/menu`} className="btn btn-quiet -ml-2 h-9 px-2 text-[13px]">
        <ArrowLeft size={15} strokeWidth={1.5} /> Menu
      </Link>
      <div className="mt-6 rounded-[18px] border border-[rgba(196,83,43,.42)] bg-[rgba(196,83,43,.12)] p-5">
        <p className="micro text-[#f0b6a0]">Order #{order.number} reject hua</p>
        <h1 className="mt-2 text-[24px] leading-tight text-cream-0" style={{ fontFamily: "var(--font-display)" }}>
          {reason}
        </h1>
        {order.rejectNote && <p className="mt-2 text-[13px] leading-relaxed text-cream-1">“{order.rejectNote}”</p>}
        <p className="mt-3 text-[12.5px] text-cream-1">Koi charge nahi laga. Neeche se kuch aur try karein.</p>
      </div>

      <h2 className="micro mt-8 mb-3 text-cream-2">Yeh bhi achhe hain</h2>
      <div className="flex flex-col gap-2">
        {alternatives.map((item) => (
          <Link
            key={item.id}
            href={`/t/${tableNumber}/menu`}
            className="glass-e1 glass-hover flex items-center gap-3 p-2.5"
          >
            <img src={`/dishes/${item.slug}-400.webp`} alt="" width={56} height={56} className="h-14 w-14 rounded-[10px] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] text-cream-0">{item.name}</p>
              <p className="mt-0.5 text-[11.5px] text-cream-2">{item.prepMinutes} min · {rupee(item.pricePaise)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
