"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, Star, X } from "lucide-react";
import { RATING_WORDS, REVIEW_CHIPS } from "@/lib/utils/html";
import { GlassTextarea } from "@/components/ui/GlassInput";
import { rupee } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

type Lang = "hi" | "en";

type Routed = {
  reviewId: string;
  route: "GOOGLE" | "PRIVATE";
  couponCode: string | null;
  couponLabel: string | null;
  googleUrl: string | null;
  message: string;
  composed: string;
};

export function ReviewFlow({
  tableNumber,
  sessionId,
  billId,
  billTotalPaise,
  alreadyReviewed,
  existing,
  guestName,
}: {
  tableNumber: string;
  sessionId: string;
  billId: string | null;
  billTotalPaise: number;
  alreadyReviewed: boolean;
  existing: { rating: number; route: "GOOGLE" | "PRIVATE"; couponCode: string | null; chips: string[] } | null;
  guestName: string | null;
}) {
  const reduce = useReducedMotion();
  const [lang, setLang] = useState<Lang>("hi");
  const [rating, setRating] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Routed | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const positive = rating >= 4;
  const labels = positive ? REVIEW_CHIPS.positive : REVIEW_CHIPS.negative;
  // chips are tracked by index so the language switch can never desync a selection
  const selected = picked.map((i) => labels[lang][i]).filter(Boolean) as string[];

  const setStars = (value: number) => {
    if (value !== rating) setPicked([]);
    setRating(value);
  };

  const toggle = (index: number) => {
    setPicked((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const submit = async () => {
    if (!billId || rating === 0) return;
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, billId, rating, chips: selected, freeText: text.trim() || null }),
    });
    const json = (await response.json()) as { ok: true; data: Routed } | { ok: false; message: string };
    setSubmitting(false);
    if (!json.ok) {
      setError(json.message);
      return;
    }
    setResult(json.data);
    if (json.data.route === "GOOGLE" && json.data.composed) {
      try {
        await navigator.clipboard.writeText(json.data.composed);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
  };

  if (skipped) {
    return (
      <Shell tableNumber={tableNumber}>
        <h1 className="text-[26px] leading-tight" style={{ fontFamily: "var(--font-display)" }}>Theek hai, no pressure.</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-cream-1">
          Bill already settled hai. Aap seedha nikal sakte hain.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Link href={`/t/${tableNumber}/menu`} className="btn btn-ghost w-full">Menu dekhein</Link>
          <Link href="/demo" className="btn btn-quiet w-full text-[12.5px]">Demo launcher</Link>
        </div>
      </Shell>
    );
  }

  if (alreadyReviewed && existing) {
    return (
      <Shell tableNumber={tableNumber}>
        <h1 className="text-[26px] leading-tight" style={{ fontFamily: "var(--font-display)" }}>Review already de diya.</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-cream-1">
          {existing.route === "GOOGLE"
            ? "Public route pe gaya hai. Shukriya."
            : "Private note manager ke paas hai. Woh dekh lenge."}
        </p>
        {existing.couponCode && <p className="mono mt-4 text-[13px] text-accent">{existing.couponCode}</p>}
        {existing.chips.length > 0 && (
          <p className="mt-3 text-[12px] text-cream-2">{existing.chips.join(" · ")}</p>
        )}
        <div className="mt-8 flex flex-col gap-2">
          <Link href={`/t/${tableNumber}/menu`} className="btn btn-ghost w-full">Menu</Link>
          <Link href="/demo" className="btn btn-quiet w-full text-[12.5px]">Demo launcher</Link>
        </div>
      </Shell>
    );
  }

  if (result) {
    const toGoogle = result.route === "GOOGLE";
    return (
      <Shell tableNumber={tableNumber}>
        <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}>
          <h1 className="text-[27px] leading-[1.1]" style={{ fontFamily: "var(--font-display)" }}>
            {toGoogle ? "Shukriya." : "Bataane ke liye shukriya."}
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-cream-1">{result.message}</p>
        </motion.div>

        {result.couponCode && (
          <div className="mt-6 rounded-[16px] border border-dashed border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.06)] p-4">
            <p className="micro text-accent">{toGoogle ? "Next visit" : "Sorry token"}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="mono text-[20px] leading-none text-cream-0">{result.couponCode}</p>
                <p className="mt-1 text-[11.5px] text-cream-2">{result.couponLabel} · 30 din tak</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.couponCode!);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="btn btn-ghost h-9 px-3 text-[12px]"
              >
                {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.6} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {toGoogle && result.googleUrl && (
          <>
            <p className="mt-5 text-[12px] leading-relaxed text-cream-1">
              Aapka likha hua copy ho gaya hai — Google pe paste kar dein, 20 second ka kaam.
            </p>
            <a
              href={result.googleUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => void fetch(`/api/reviews/${result.reviewId}/google-click`, { method: "POST" })}
              className="btn btn-primary mt-3 w-full"
            >
              Google pe kholo
            </a>
          </>
        )}

        {!toGoogle && (
          <p className="mt-4 rounded-[12px] border border-[var(--hairline)] px-3.5 py-3 text-[12px] leading-relaxed text-cream-1">
            Yeh review public nahi hoga. Sirf Alsa ka manager dekh sakta hai.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Link href={`/t/${tableNumber}/menu`} className="btn btn-ghost w-full">Done</Link>
          <Link href="/demo" className="btn btn-quiet w-full text-[12.5px]">Demo launcher</Link>
        </div>
        <p className="mono mt-8 text-center text-[10.5px] text-cream-2">Sample build · payments simulated</p>
      </Shell>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] pb-16">
      <header className="flex items-start justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div>
          <p className="micro text-cream-2">{tableNumber} · Alsa</p>
          <p className="mt-1 text-[11.5px] text-cream-2">Bill {rupee(billTotalPaise)} · paid</p>
        </div>
        <div className="flex items-center gap-1">
          {(["hi", "en"] as Lang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                lang === code ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.1)] text-[#f5dfc2]" : "border-[var(--hairline)] text-cream-2",
              )}
            >
              {code === "hi" ? "हिं" : "EN"}
            </button>
          ))}
          <button type="button" onClick={() => setSkipped(true)} className="ml-1.5 text-[11.5px] text-cream-2 underline underline-offset-4">
            Skip
          </button>
        </div>
      </header>

      <main className="px-4 pt-7">
        <h1 className="text-[27px] leading-[1.12]" style={{ fontFamily: "var(--font-display)" }}>
          {lang === "hi"
            ? guestName ? `${guestName}, khana kaisa laga?` : "Khana kaisa laga?"
            : guestName ? `${guestName}, how was the food?` : "How was the food?"}
        </h1>
        <p className="mt-1.5 text-[12.5px] text-cream-2">
          {lang === "hi" ? "Ek tap. Ek line. Bas." : "One tap. One line. Done."}
        </p>

        <div className="mt-7 flex items-center justify-center gap-1" role="group" aria-label="Rate your meal out of five">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating >= n}
              className="grid h-[52px] w-[52px] place-items-center transition-transform duration-150 active:scale-95"
            >
              <Star
                size={30}
                strokeWidth={1.25}
                className={cn("transition-colors duration-200", n <= rating ? "fill-accent text-accent" : "text-cream-2/40")}
              />
            </button>
          ))}
        </div>
        <p className="mt-1 h-6 text-center text-[13px] text-cream-1" aria-live="polite">
          {rating > 0 ? RATING_WORDS[rating]![lang] : ""}
        </p>
        {rating === 5 && (
          <p className="text-center text-[11.5px] text-accent">
            {lang === "hi" ? "Review daalne pe next visit 10% off" : "10% off your next visit when you post it"}
          </p>
        )}

        {rating > 0 && (
          <motion.section
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.1 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5"
            aria-labelledby="chips-heading"
          >
            <div className="flex items-baseline justify-between">
              <h2 id="chips-heading" className="text-[13.5px] text-cream-1">
                {positive ? (lang === "hi" ? "Kya khaas laga?" : "What stood out?") : lang === "hi" ? "Kya theek nahi tha?" : "What went wrong?"}
              </h2>
              <span className="text-[11px] text-cream-2">{picked.length ? `${picked.length} ✓` : lang === "hi" ? "optional" : "optional"}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {labels[lang].map((label, index) => {
                const on = picked.includes(index);
                return (
                  <button
                    key={`${lang}-${index}`}
                    type="button"
                    onClick={() => toggle(index)}
                    aria-pressed={on}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-[12px] transition-colors duration-150",
                      on
                        ? "border-[rgba(232,164,85,.5)] bg-[rgba(232,164,85,.15)] text-[#f5dfc2]"
                        : "border-[var(--hairline)] bg-white/[.02] text-cream-1 hover:bg-white/[.055]",
                    )}
                  >
                    {label}
                    {on && <X size={10} strokeWidth={2.6} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* the sentence builds itself — the whole reason this flow converts */}
        {(selected.length > 0 || text.length > 0) && (
          <section className="mt-5" aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="micro mb-2 text-cream-2">
              {lang === "hi" ? "Aapka review" : "Your review"}
            </h2>
            <div className="rounded-[14px] border border-[var(--hairline)] bg-white/[.025] px-3.5 py-3">
              <p className="text-[12.5px] leading-[1.7] text-cream-1">
                {picked.map((index) => {
                  const label = labels[lang][index];
                  if (!label) return null;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggle(index)}
                      className="mr-1 inline-flex items-baseline gap-1 rounded-[4px] bg-[rgba(232,164,85,.13)] px-1.5 py-[1px] text-[12px] text-[#f5dfc2]"
                      aria-label={`Remove ${label}`}
                    >
                      {label}
                      <X size={8} strokeWidth={3} />
                    </button>
                  );
                })}
                {text.trim() && <span className="text-cream-1">{text.trim()}</span>}
                <span className="text-cream-2">.</span>
              </p>
            </div>
          </section>
        )}

        {rating > 0 && (
          <section className="mt-4">
            <label htmlFor="free-text" className="micro mb-2 block text-cream-2">
              {lang === "hi" ? "Apne shabdon mein" : "In your own words"}
            </label>
            <GlassTextarea
              id="free-text"
              rows={2}
              maxLength={400}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                positive
                  ? lang === "hi" ? "Jo achha laga, likh dein." : "Tell them what worked."
                  : lang === "hi" ? "Kya theek nahi tha, saaf likh dein." : "Say plainly what went wrong."
              }
              className="text-[13px]"
            />
            <p className="mt-1 text-right text-[10.5px] text-cream-2">{text.length}/400</p>
          </section>
        )}

        {error && <p className="mt-2 text-[12px] text-[#f0b6a0]">{error}</p>}

        <div className="mt-5">
          <button
            type="button"
            onClick={submit}
            disabled={rating === 0 || submitting || !billId}
            className="btn btn-primary w-full"
          >
            {submitting ? (lang === "hi" ? "Bhej rahe hain…" : "Sending…") : lang === "hi" ? "Review bhejein" : "Send review"}
          </button>
          <p className="mt-3 text-center text-[10.5px] leading-relaxed text-cream-2">
            {lang === "hi"
              ? "4–5 star Google pe jaate hain. 3 aur neeche seedha manager ke paas — public nahi hote."
              : "4–5★ goes to Google. 3 and below goes straight to the manager — never public."}
          </p>
        </div>
      </main>
    </div>
  );
}

function Shell({ tableNumber, children }: { tableNumber: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center px-5 pb-20 pt-[max(20px,env(safe-area-inset-top))]">
      <p className="micro mb-5 text-cream-2">{tableNumber} · Alsa</p>
      {children}
    </div>
  );
}
