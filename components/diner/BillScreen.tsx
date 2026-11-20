"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Clock, CreditCard, Loader2, Receipt, Split, Users, Wallet } from "lucide-react";
import { GlassSheet } from "@/components/glass/GlassSheet";
import { rupee } from "@/lib/utils/money";
import { idemKey } from "@/lib/utils/idem";
import { cn } from "@/lib/utils/cn";

export type BillView = {
  id: string;
  number: string;
  state: "DRAFT" | "REQUESTED" | "PARTIALLY_PAID" | "PAID" | "VOID";
  subtotalPaise: number;
  taxPaise: number;
  servicePaise: number;
  discountPaise: number;
  tipPaise: number;
  totalPaise: number;
  taxPct: number;
  servicePct: number;
  items: Array<{ name: string; qty: number; pricePaise: number; state: string; notes: string | null }>;
  splits: Array<{ id: string; label: string; amountPaise: number; paid: boolean }>;
  payments: Array<{ id: string; method: string; state: string; amountPaise: number; settledAt: number | null }>;
  settledPaise: number;
  guestCount: number;
  tableNumber: string;
  sessionState: string;
};

const PAY_METHODS = [
  { key: "UPI", label: "UPI", hint: "PhonePe · GPay · Paytm", icon: Wallet },
  { key: "CASH", label: "Cash", hint: "waiter se", icon: Receipt },
  { key: "CARD", label: "Card", hint: "machine lagegi", icon: CreditCard },
] as const;

export function BillScreen({ bill, tableNumber }: { bill: BillView | null; tableNumber: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [payOpen, setPayOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [method, setMethod] = useState<"UPI" | "CASH" | "CARD">("UPI");
  const [intent, setIntent] = useState<{ paymentId: string; qrSvg: string | null; amountPaise: number; method: string } | null>(null);
  const [phase, setPhase] = useState<"idle" | "creating" | "waiting" | "settling" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ways, setWays] = useState(Math.max(2, Math.min(8, bill?.guestCount ?? 2)));
  const [tipChoice, setTipChoice] = useState(0);
  const [donePayment, setDonePayment] = useState<{ amountPaise: number; billPaid: boolean } | null>(null);

  const settled = bill?.settledPaise ?? 0;
  const remaining = Math.max(0, (bill?.totalPaise ?? 0) - settled);

  useEffect(() => {
    if (phase !== "done") return;
    if (donePayment?.billPaid) {
      const t = window.setTimeout(() => router.push(`/t/${tableNumber}/review`), 2400);
      return () => window.clearTimeout(t);
    }
  }, [phase, donePayment, router, tableNumber]);

  const startPayment = async () => {
    if (!bill) return;
    setError(null);
    setPhase("creating");
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey("pay") },
      body: JSON.stringify({ billId: bill.id, method }),
    });
    const json = (await response.json()) as
      | { ok: true; data: { paymentId: string; qrSvg: string | null; amountPaise: number; method: string } }
      | { ok: false; message: string };
    if (!json.ok) {
      setError(json.message);
      setPhase("idle");
      return;
    }
    setIntent(json.data);
    setPhase("waiting");
  };

  const simulate = async () => {
    if (!intent) return;
    setPhase("settling");
    // the mock provider settles on its own schedule; the UI shows the wait honestly
    await new Promise((resolve) => setTimeout(resolve, 1600));
    const response = await fetch(`/api/payments/${intent.paymentId}/simulate`, { method: "POST" });
    const json = (await response.json()) as
      | { ok: true; data: { billPaid: boolean; amountPaise: number } }
      | { ok: false; message: string };
    if (!json.ok) {
      setError(json.message);
      setPhase("waiting");
      return;
    }
    setDonePayment({ amountPaise: json.data.amountPaise, billPaid: json.data.billPaid });
    setPhase("done");
    router.refresh();
  };

  const makeSplits = async () => {
    if (!bill) return;
    const response = await fetch(`/api/bills/${bill.id}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "EQUAL", ways }),
    });
    const json = (await response.json()) as { ok: boolean; message?: string };
    if (!json.ok) {
      setError(json.message ?? "Split nahi hua");
      return;
    }
    setSplitOpen(false);
    router.refresh();
  };

  const saveTip = async (pct: number) => {
    if (!bill) return;
    setTipChoice(pct);
    const tip = Math.round((bill.subtotalPaise - bill.discountPaise) * (pct / 100));
    await fetch(`/api/bills/${bill.id}/tip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipPaise: tip }),
    });
    router.refresh();
  };

  const closed = bill?.state === "PAID";
  const lineItems = useMemo(() => bill?.items ?? [], [bill]);

  if (!bill) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center px-5 pb-24">
        <Receipt size={22} strokeWidth={1.4} className="text-cream-2" aria-hidden="true" />
        <h1 className="mt-4 text-[24px] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          Bill abhi nahi bana
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-cream-1">
          Pehle kuch order karein — ya waiter se kahein to bill seedha table pe aa jayega.
        </p>
        <Link href={`/t/${tableNumber}/menu`} className="btn btn-primary mt-6 w-fit">
          <ArrowLeft size={14} strokeWidth={1.6} /> Menu pe wapas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] pb-32">
      <header className="sticky top-0 z-30 glass-e3 rounded-none border-x-0 border-t-0 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link href={`/t/${tableNumber}/menu`} className="btn btn-quiet -ml-2 h-9 px-2 text-[13px]">
            <ArrowLeft size={15} strokeWidth={1.5} /> Menu
          </Link>
          <p className="mono text-[12px] text-cream-2">{bill.number}</p>
        </div>
      </header>

      <main className="px-4 pt-5">
        <p className="micro text-cream-2">{tableNumber} · bill</p>
        <h1 className="mt-2 text-[30px] leading-none num" style={{ fontFamily: "var(--font-display)" }}>
          {rupee(bill.totalPaise)}
        </h1>
        <p className="mt-1.5 text-[12.5px] text-cream-1">
          {closed
            ? "Paid. Koi pending nahi."
            : settled > 0
              ? `${rupee(settled)} of ${rupee(bill.totalPaise)} paid`
              : `GST ${bill.taxPct}% included`}
        </p>

        {closed && (
          <div className="mt-4 flex items-center gap-2.5 rounded-[12px] border border-[rgba(127,209,174,.35)] bg-[rgba(127,209,174,.1)] px-3.5 py-3">
            <Check size={14} strokeWidth={2} className="text-[#a9e2c9]" aria-hidden="true" />
            <p className="text-[12.5px] text-cream-1">Payment settle ho gayi. Table saaf hone ke liye ready hai.</p>
          </div>
        )}

        {/* line items */}
        <section className="glass-e1 mt-5 p-4" aria-labelledby="bill-items">
          <h2 id="bill-items" className="micro mb-3 text-cream-2">Aapka order</h2>
          <ul className="flex flex-col gap-2">
            {lineItems.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex items-start justify-between gap-3 text-[13px]">
                <span className="min-w-0 text-cream-1">
                  <span className="mono mr-1.5 text-cream-2">{item.qty}×</span>
                  <span className={item.state === "CANCELLED" ? "line-through text-cream-2" : ""}>{item.name}</span>
                  {item.notes && <span className="block pl-6 text-[11px] text-cream-2">{item.notes}</span>}
                </span>
                <span className={cn("mono shrink-0", item.state === "CANCELLED" ? "text-cream-2 line-through" : "text-cream-0")}>
                  {rupee(item.pricePaise * item.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-[var(--hairline)] pt-3 text-[12.5px]">
            <Line label="Subtotal" value={rupee(bill.subtotalPaise)} />
            {bill.discountPaise > 0 && <Line label="Discount" value={`− ${rupee(bill.discountPaise)}`} tone="mint" />}
            <Line label={`GST ${bill.taxPct}%`} value={rupee(bill.taxPaise)} />
            {bill.servicePaise > 0 && <Line label={`Service ${bill.servicePct}%`} value={rupee(bill.servicePaise)} />}
            {bill.tipPaise > 0 && <Line label="Tip" value={rupee(bill.tipPaise)} />}
            <div className="flex items-center justify-between pt-1.5 text-[14.5px] text-cream-0">
              <span>Total</span>
              <span className="mono">{rupee(bill.totalPaise)}</span>
            </div>
            {settled > 0 && (
              <div className="flex items-center justify-between text-[12px] text-[#a9e2c9]">
                <span>Paid</span>
                <span className="mono">{rupee(settled)}</span>
              </div>
            )}
          </div>
        </section>

        {/* tip */}
        {!closed && (
          <section className="mt-4" aria-labelledby="tip-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="tip-heading" className="micro text-cream-2">Tip</h2>
              <span className="text-[11px] text-cream-2">optional</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[0, 5, 10, 15].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => saveTip(p)}
                  aria-pressed={tipChoice === p}
                  className={cn(
                    "flex-1 rounded-[10px] border py-2 text-[12px] transition-colors",
                    tipChoice === p ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.13)] text-[#f5dfc2]" : "border-[var(--hairline)] text-cream-1",
                  )}
                >
                  {p === 0 ? "No tip" : `${p}%`}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* splits */}
        {bill.splits.length > 0 && (
          <section className="mt-5" aria-labelledby="split-heading">
            <h2 id="split-heading" className="micro mb-2.5 text-cream-2">Split · {bill.splits.length} ways</h2>
            <div className="flex flex-col gap-1.5">
              {bill.splits.map((split) => (
                <div key={split.id} className={cn("flex items-center justify-between rounded-[11px] border px-3 py-2.5 text-[12.5px]", split.paid ? "border-[rgba(127,209,174,.3)] bg-[rgba(127,209,174,.07)]" : "border-[var(--hairline)]")}>
                  <span className="flex items-center gap-2 text-cream-1">
                    <Users size={12} strokeWidth={1.6} className="text-cream-2" /> {split.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="mono text-cream-0">{rupee(split.amountPaise)}</span>
                    {split.paid ? (
                      <span className="text-[10px] uppercase tracking-[.06em] text-[#a9e2c9]">paid</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setMethod("UPI"); setPayOpen(true); }}
                        className="rounded-full border border-[var(--hairline-strong)] px-2 py-[2px] text-[10.5px] text-cream-1"
                      >
                        pay
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-cream-2">
          Demo environment — no money moves. UPI intent asli format mein banta hai, gateway mock hai.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {!closed && bill.splits.length === 0 && (
            <button type="button" onClick={() => setPayOpen(true)} className="btn btn-primary w-full">
              Pay {rupee(remaining > 0 ? remaining : bill.totalPaise)}
            </button>
          )}
          {!closed && (
            <>
              {bill.splits.length === 0 && (
                <button type="button" onClick={() => setSplitOpen(true)} className="btn btn-ghost w-full">
                  <Split size={14} strokeWidth={1.6} /> Split bill
                </button>
              )}
              <a href={`/print/bill/${bill.id}`} target="_blank" rel="noreferrer" className="btn btn-quiet w-full text-[13px]">
                Print-style bill dekhein
              </a>
            </>
          )}
          {closed && (
            <Link href={`/t/${tableNumber}/review`} className="btn btn-primary w-full">Review likhein</Link>
          )}
        </div>
      </main>

      {/* payment sheet */}
      <GlassSheet
        open={payOpen}
        onClose={() => { setPayOpen(false); setPhase("idle"); setIntent(null); }}
        title="Pay"
        description={`${bill.number} · ${rupee(remaining > 0 ? remaining : bill.totalPaise)}`}
        footer={
          phase === "idle" ? (
            <button type="button" onClick={startPayment} className="btn btn-primary w-full">
              {method === "UPI" ? "UPI se pay karein" : method === "CASH" ? "Cash — waiter ko bulaayein" : "Card — machine lagegi"}
            </button>
          ) : phase === "waiting" ? (
            <button type="button" onClick={simulate} className="btn btn-primary w-full">
              Simulate payment success
            </button>
          ) : phase === "settling" ? (
            <button type="button" disabled className="btn btn-primary w-full">
              <Loader2 size={14} className="animate-spin" /> Settling…
            </button>
          ) : null
        }
      >
        {phase === "idle" && (
          <div className="flex flex-col gap-2">
            {PAY_METHODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={cn(
                  "flex items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left transition-colors",
                  method === m.key ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.1)]" : "border-[var(--hairline)]",
                )}
              >
                <m.icon size={16} strokeWidth={1.5} className={method === m.key ? "text-accent" : "text-cream-2"} />
                <span className="flex-1">
                  <span className="block text-[13px] text-cream-0">{m.label}</span>
                  <span className="block text-[11px] text-cream-2">{m.hint}</span>
                </span>
                {method === m.key && <Check size={14} strokeWidth={2} className="text-accent" />}
              </button>
            ))}
            <p className="mt-1 text-[11px] leading-relaxed text-cream-2">
              Demo environment — no money moves. Cash pe waiter confirm karega.
            </p>
          </div>
        )}

        {(phase === "waiting" || phase === "settling" || phase === "done") && (
          <div className="flex flex-col items-center">
            {phase === "waiting" && intent?.method === "UPI" && intent.qrSvg && (
              <>
                <div
                  className="rounded-[10px] bg-cream-0 p-3 [&_svg]:block [&_svg]:h-[220px] [&_svg]:w-[220px]"
                  dangerouslySetInnerHTML={{ __html: intent.qrSvg }}
                  aria-label="UPI payment QR code"
                />
                <p className="mono mt-3 text-[15px] text-cream-0">{rupee(intent.amountPaise)}</p>
                <p className="mt-1 text-[11.5px] text-cream-2">Scan karein · asli UPI intent, mock gateway</p>
                <div className="mt-4 flex items-center gap-3 text-[10.5px] uppercase tracking-[.08em] text-cream-2">
                  <span>PhonePe</span><span className="text-[var(--hairline-strong)]">·</span>
                  <span>GPay</span><span className="text-[var(--hairline-strong)]">·</span>
                  <span>Paytm</span><span className="text-[var(--hairline-strong)]">·</span>
                  <span>BHIM</span>
                </div>
              </>
            )}
            {phase === "waiting" && intent?.method === "CASH" && (
              <div className="py-4 text-center">
                <Clock size={20} strokeWidth={1.4} className="mx-auto text-accent" />
                <p className="mt-3 text-[14px] text-cream-0">Waiter ko bula liya hai</p>
                <p className="mt-1.5 max-w-[34ch] text-[12.5px] leading-relaxed text-cream-1">
                  Cash pahunchne pe waiter yahan se confirm karega. Tab tak bill pending dikhega.
                </p>
                <p className="mono mt-3 text-[12px] text-cream-2">payment {intent.paymentId.slice(-6)}</p>
              </div>
            )}
            {phase === "waiting" && intent?.method === "CARD" && (
              <div className="py-4 text-center">
                <CreditCard size={20} strokeWidth={1.4} className="mx-auto text-accent" />
                <p className="mt-3 text-[14px] text-cream-0">Card machine table pe aa rahi hai</p>
                <p className="mt-1.5 max-w-[34ch] text-[12.5px] leading-relaxed text-cream-1">
                  Demo mein machine skip karein — neeche se simulate kar sakein.
                </p>
              </div>
            )}
            {phase === "settling" && (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 size={22} className="animate-spin text-accent" />
                <p className="text-[13px] text-cream-1">3 second UPI settlement chalu…</p>
                <p className="text-[11px] text-cream-2">Yeh hamara mock provider hai, real gateway nahi.</p>
              </div>
            )}
            {phase === "done" && donePayment && (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(127,209,174,.45)] bg-[rgba(127,209,174,.14)]">
                  <Check size={20} strokeWidth={2} className="text-[#a9e2c9]" />
                </span>
                <p className="mt-4 text-[15px] text-cream-0">{rupee(donePayment.amountPaise)} settle ho gaya</p>
                <p className="mt-1.5 text-[12.5px] text-cream-1">
                  {donePayment.billPaid ? "Bill poora paid. Review 2 second mein khulega." : "Partial paid — baaki splits pending hain."}
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-[12px] text-[#f0b6a0]">{error}</p>}
      </GlassSheet>

      {/* split sheet */}
      <GlassSheet
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        title="Split equally"
        description={`Total ${rupee(bill.totalPaise)} — paise idhar-udhar nahi honge.`}
        footer={<button type="button" onClick={makeSplits} className="btn btn-primary w-full">Create {ways} splits</button>}
      >
        <div className="flex items-center justify-between rounded-[12px] border border-[var(--hairline)] px-4 py-3">
          <button type="button" onClick={() => setWays((w) => Math.max(2, w - 1))} aria-label="Fewer splits" className="btn btn-quiet h-9 w-9 px-0 text-[18px]">−</button>
          <div className="text-center">
            <p className="mono text-[22px] leading-none">{ways}</p>
            <p className="mt-1 text-[11px] text-cream-2">ways</p>
          </div>
          <button type="button" onClick={() => setWays((w) => Math.min(8, w + 1))} aria-label="More splits" className="btn btn-quiet h-9 w-9 px-0 text-[18px]">+</button>
        </div>
        <div className="mt-4 space-y-1.5">
          {Array.from({ length: ways }).map((_, i) => {
            const base = Math.floor(bill.totalPaise / ways);
            const remainder = bill.totalPaise - base * ways;
            return (
              <div key={i} className="flex items-center justify-between text-[12.5px]">
                <span className="text-cream-1">Guest {i + 1}</span>
                <span className="mono text-cream-0">{rupee(base + (i < remainder ? 1 : 0))}</span>
              </div>
            );
          })}
        </div>
        <AnimatePresence>
          {!reduce && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-[11px] leading-relaxed text-cream-2">
              Baaki paise pehle split pe daal diye jaate hain — total exactly match karta hai.
            </motion.p>
          )}
        </AnimatePresence>
      </GlassSheet>
    </div>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "mint" }) {
  return (
    <div className="flex items-center justify-between text-cream-1">
      <span>{label}</span>
      <span className={cn("mono", tone === "mint" && "text-[#a9e2c9]")}>{value}</span>
    </div>
  );
}
