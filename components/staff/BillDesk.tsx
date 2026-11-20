"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "motion/react";
import { ArrowLeft, BadgePercent, Ban, Check, Printer, Receipt, Wallet } from "lucide-react";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { GlassInput } from "@/components/ui/GlassInput";
import { rupee } from "@/lib/utils/money";
import { clockTime, duration } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

export type DeskBill = {
  id: string;
  number: string;
  state: string;
  subtotalPaise: number;
  taxPaise: number;
  servicePaise: number;
  discountPaise: number;
  tipPaise: number;
  totalPaise: number;
  taxPct: number;
  servicePct: number;
  items: Array<{ id: string; name: string; qty: number; pricePaise: number; state: string; notes: string | null; station: string }>;
  splits: Array<{ id: string; label: string; amountPaise: number; paid: boolean }>;
  payments: Array<{ id: string; method: string; state: string; amountPaise: number; settledAt: number | null; createdAt: number }>;
  settledPaise: number;
  tableNumber: string;
  sessionId: string;
  openedAt: number;
  guestCount: number;
  serverName: string | null;
};

type PaymentRow = { id: string; method: string; state: string; amountPaise: number; settledAt: number | null };

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ ok: boolean; data: DeskBill }>);

export function BillDesk({ initial, canDiscount }: { initial: DeskBill; canDiscount: boolean }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ ok: boolean; data: DeskBill }>(`/api/staff/bills/${initial.id}`, fetcher, {
    fallbackData: { ok: true, data: initial },
    refreshInterval: 2500,
  });
  const bill = data?.ok ? data.data : initial;
  const [pending, setPending] = useState<PaymentRow | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const completed = bill.payments.filter((p) => p.state === "SUCCESS");
  const awaiting = bill.payments.filter((p) => p.state === "PENDING");
  const remaining = Math.max(0, bill.totalPaise - bill.settledPaise);
  const paidInFull = bill.state === "PAID" || remaining === 0;

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const confirm = async (payment: PaymentRow) => {
    const response = await fetch(`/api/staff/payments/${payment.id}/confirm`, { method: "POST" });
    const json = (await response.json()) as { ok: boolean; message?: string };
    if (!json.ok) {
      flash(json.message ?? "Confirm nahi hua");
      return;
    }
    setPending(null);
    flash(`${rupee(payment.amountPaise)} ${payment.method.toLowerCase()} confirm ho gaya`);
    void mutate();
    router.refresh();
  };

  const requestCash = async () => {
    const response = await fetch(`/api/staff/bills/${bill.id}/request-cash`, { method: "POST" });
    const json = (await response.json()) as { ok: boolean; message?: string };
    if (!json.ok) return flash(json.message ?? "Nahi hua");
    flash("Guest ko cash ke liye bolein — phir confirm karein");
    void mutate();
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[720px] pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--hairline)] bg-[rgba(10,11,13,.82)] px-3 py-2.5 backdrop-blur-xl">
        <button type="button" onClick={() => router.back()} className="btn btn-quiet h-9 px-2 text-[13px]">
          <ArrowLeft size={15} strokeWidth={1.6} /> Floor
        </button>
        <p className="mono ml-auto text-[11.5px] text-cream-2">{bill.number}</p>
        <span className="live-dot" aria-hidden="true" />
      </header>

      <main className="px-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="micro text-cream-2">{bill.tableNumber} · {bill.guestCount} guests</p>
            <h1 className="mono mt-1.5 text-[32px] leading-none text-cream-0">{rupee(bill.totalPaise)}</h1>
            <p className="mt-1.5 text-[12px] text-cream-2">
              opened {clockTime(bill.openedAt)} · {bill.serverName ? `${bill.serverName} ne serve kiya` : "unassigned"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "rounded-full border px-2.5 py-[3px] text-[10px] uppercase tracking-[.07em]",
                paidInFull
                  ? "border-[rgba(127,209,174,.4)] bg-[rgba(127,209,174,.1)] text-[#a9e2c9]"
                  : "border-[rgba(232,164,85,.4)] bg-[rgba(232,164,85,.1)] text-[#f5dfc2]",
              )}
            >
              {bill.state.toLowerCase().replace("_", " ")}
            </span>
            {bill.settledPaise > 0 && !paidInFull && (
              <span className="mono text-[10.5px] text-cream-2">{rupee(bill.settledPaise)} in</span>
            )}
          </div>
        </div>

        {/* line items with live kitchen state — the waiter can answer "mera order kahan hai" from this screen */}
        <section className="mt-5 overflow-hidden rounded-[14px] border border-[var(--hairline)]">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--hairline)]">
                {["Item", "State", "Qty", "Amount"].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      "px-3 py-2 text-[9.5px] font-normal uppercase tracking-[.08em] text-cream-2",
                      i > 1 ? "text-right" : "text-left",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--hairline)]/50 last:border-0">
                  <td className="px-3 py-2 text-cream-0">
                    {item.name}
                    {item.notes && <span className="block text-[10.5px] text-accent">{item.notes}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded-[4px] px-1.5 py-[1px] text-[9.5px] uppercase tracking-[.05em]", stateTone(item.state))}>
                      {item.state.toLowerCase()}
                    </span>
                  </td>
                  <td className="mono px-3 py-2 text-right text-cream-1">{item.qty}</td>
                  <td className={cn("mono px-3 py-2 text-right", item.state === "CANCELLED" ? "text-cream-2 line-through" : "text-cream-0")}>
                    {rupee(item.pricePaise * item.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <section className="rounded-[14px] border border-[var(--hairline)] p-3.5">
            <h2 className="micro text-cream-2">Totals</h2>
            <dl className="mt-2.5 space-y-1.5 text-[12px]">
              <Row label="Subtotal" value={rupee(bill.subtotalPaise)} />
              {bill.discountPaise > 0 && <Row label="Discount" value={`− ${rupee(bill.discountPaise)}`} tone="mint" />}
              <Row label={`GST ${bill.taxPct}%`} value={rupee(bill.taxPaise)} />
              {bill.servicePaise > 0 && <Row label={`Service ${bill.servicePct}%`} value={rupee(bill.servicePaise)} />}
              {bill.tipPaise > 0 && <Row label="Tip" value={rupee(bill.tipPaise)} />}
              <div className="flex items-center justify-between border-t border-[var(--hairline)] pt-1.5 text-[13.5px] text-cream-0">
                <dt>Total</dt>
                <dd className="mono">{rupee(bill.totalPaise)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[14px] border border-[var(--hairline)] p-3.5">
            <h2 className="micro text-cream-2">Payments</h2>
            {completed.length === 0 && awaiting.length === 0 ? (
              <p className="mt-2.5 text-[12px] text-cream-2">Koi payment nahi — guest abhi tak pay nahi kiya.</p>
            ) : (
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {completed.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-[9px] border border-[rgba(127,209,174,.28)] bg-[rgba(127,209,174,.06)] px-2.5 py-2">
                    <span className="flex items-center gap-1.5 text-[11.5px] text-cream-1">
                      <Check size={11} strokeWidth={2.4} className="text-[#a9e2c9]" /> {p.method}
                    </span>
                    <span className="mono text-[11.5px] text-cream-0">{rupee(p.amountPaise)}</span>
                  </li>
                ))}
                {awaiting.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-[9px] border border-[rgba(232,164,85,.35)] bg-[rgba(232,164,85,.07)] px-2.5 py-1.5">
                    <span className="text-[11.5px] text-cream-1">{p.method} pending</span>
                    <button type="button" onClick={() => setPending(p)} className="btn btn-primary h-7 px-2.5 text-[11px]">
                      Confirm
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {awaiting.length > 0 && (
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-cream-2">
                Guest ne khud bheja hai. Cash/UPI confirm karke bill band karein.
              </p>
            )}
          </section>
        </div>

        {bill.splits.length > 0 && (
          <section className="mt-3 rounded-[14px] border border-[var(--hairline)] p-3.5">
            <h2 className="micro text-cream-2">Splits · {bill.splits.length}</h2>
            <ul className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {bill.splits.map((split) => (
                <li key={split.id} className={cn("rounded-[9px] border px-2.5 py-2 text-[11px]", split.paid ? "border-[rgba(127,209,174,.3)] text-cream-2" : "border-[var(--hairline)] text-cream-1")}>
                  <span className="block truncate">{split.label}</span>
                  <span className="mono mt-0.5 block text-[12px] text-cream-0">{rupee(split.amountPaise)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {!paidInFull && (
            <>
              <button type="button" onClick={requestCash} className="btn btn-primary h-10 flex-1 text-[12.5px]">
                <Wallet size={14} strokeWidth={1.7} /> Cash collect karein
              </button>
              <a href={`/print/bill/${bill.id}`} target="_blank" rel="noreferrer" className="btn btn-ghost h-10 text-[12.5px]">
                <Printer size={14} strokeWidth={1.6} /> Print
              </a>
            </>
          )}
          {canDiscount && !paidInFull && (
            <button type="button" onClick={() => setDiscountOpen(true)} className="btn btn-ghost h-10 text-[12.5px]">
              <BadgePercent size={14} strokeWidth={1.6} /> Discount
            </button>
          )}
          {paidInFull && (
            <div className="flex w-full flex-wrap items-center gap-2 rounded-[12px] border border-[rgba(127,209,174,.3)] bg-[rgba(127,209,174,.07)] px-3.5 py-3">
              <Check size={14} strokeWidth={2.2} className="text-[#a9e2c9]" />
              <p className="flex-1 text-[12px] text-cream-1">Bill settled. Table saaf karne ke liye chhod dein.</p>
              <a href={`/print/bill/${bill.id}`} target="_blank" rel="noreferrer" className="btn btn-quiet h-8 px-2.5 text-[11.5px]">
                <Receipt size={12} strokeWidth={1.6} /> Copy
              </a>
            </div>
          )}
        </div>

        <p className="mt-4 text-[10.5px] leading-relaxed text-cream-2">
          Cash confirm karne se pehle note ginein. Discount sirf manager PIN se — har attempt log hota hai.
        </p>
      </main>

      {/* cash confirm */}
      <GlassSheet
        open={!!pending}
        onClose={() => setPending(null)}
        title="Confirm payment"
        description={pending ? `${pending.method} · ${rupee(pending.amountPaise)}` : undefined}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => setPending(null)} className="btn btn-ghost flex-1">Cancel</button>
            <button type="button" onClick={() => pending && confirm(pending)} className="btn btn-primary flex-1">
              <Check size={14} strokeWidth={2.2} /> Paisa mila
            </button>
          </div>
        }
      >
        <div className="rounded-[10px] border border-[var(--hairline)] p-3">
          <p className="text-[12.5px] text-cream-1">
            {pending?.method === "CASH"
              ? "Cash count karke confirm karein. Yeh entry cash drawer mein count hogi."
              : "Guest ka UPI/card clear ho gaya ho tab confirm karein."}
          </p>
          <p className="mono mt-2 text-[18px] text-cream-0">{pending ? rupee(pending.amountPaise) : ""}</p>
        </div>
      </GlassSheet>

      {/* discount */}
      <DiscountSheet
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        bill={bill}
        onDone={(message) => {
          setDiscountOpen(false);
          flash(message);
          void mutate();
          router.refresh();
        }}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4" role="status" aria-live="polite">
          <div className="glass-e3 rounded-[12px] px-4 py-2 text-[12px] text-cream-0">{toast}</div>
        </div>
      )}
    </div>
  );
}

function stateTone(state: string) {
  if (state === "SERVED") return "bg-[rgba(127,209,174,.16)] text-[#a9e2c9]";
  if (state === "CANCELLED") return "bg-[rgba(196,83,43,.2)] text-[#f0b6a0]";
  if (state === "READY") return "bg-[rgba(232,164,85,.2)] text-[#f5dfc2]";
  return "bg-white/[.07] text-cream-1";
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "mint" }) {
  return (
    <div className="flex items-center justify-between text-cream-1">
      <dt>{label}</dt>
      <dd className={cn("mono", tone === "mint" && "text-[#a9e2c9]")}>{value}</dd>
    </div>
  );
}

function DiscountSheet({
  open,
  onClose,
  bill,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  bill: DeskBill;
  onDone: (message: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const paise = Math.round(Number(amount || 0) * 100);
  const proposed = bill.totalPaise - paise;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/bills/${bill.id}/discount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaise: paise, reason, managerPin: pin }),
    });
    const json = (await response.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (!json.ok) {
      setError(json.message ?? "Discount nahi laga");
      setPin("");
      return;
    }
    onDone(`Discount ${rupee(paise)} approve ho gaya`);
    setAmount("");
    setReason("");
    setPin("");
  };

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title="Discount"
      description="Manager PIN ke bina kuch nahi hota."
      footer={
        <button type="button" onClick={submit} disabled={busy || !paise || reason.length < 2 || pin.length !== 4} className="btn btn-primary w-full">
          {busy ? "Apply kar rahe hain…" : `Apply ${paise ? rupee(paise) : "discount"}`}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="disc-amount" className="micro mb-1.5 block text-cream-2">Amount</label>
          <GlassInput
            id="disc-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="mono text-[15px]"
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[5, 10, 15].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setAmount(String(Math.round((bill.subtotalPaise * (pct / 100)) / 100)))}
                className="rounded-full border border-[var(--hairline)] px-2.5 py-[3px] text-[11px] text-cream-2 hover:text-cream-1"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="disc-reason" className="micro mb-1.5 block text-cream-2">Reason</label>
          <GlassInput id="disc-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="late service, regular guest…" />
        </div>
        <div>
          <label htmlFor="disc-pin" className="micro mb-1.5 block text-cream-2">Manager PIN</label>
          <GlassInput
            id="disc-pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="mono tracking-[.5em]"
          />
        </div>
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--hairline)] px-3 py-2.5">
          <span className="text-[11.5px] text-cream-2">New total</span>
          <span className="mono text-[14px] text-cream-0">{rupee(Math.max(0, proposed))}</span>
        </div>
        {error && <p className="text-[11.5px] leading-relaxed text-[#f0b6a0]">{error}</p>}
        <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-cream-2">
          <Ban size={11} strokeWidth={1.6} className="mt-[2px] shrink-0" />
          Waiter PIN yahan kaam nahi karta. Galat PIN ka attempt audit log mein jaata hai.
        </p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-cream-2">
          {duration(Date.now() - bill.openedAt)} dine · {bill.guestCount} covers
        </motion.p>
      </div>
    </GlassSheet>
  );
}
