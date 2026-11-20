"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"];

export function PinPad({ next }: { next: string | null }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (pin.length !== 4 || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    fetch("/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    })
      .then((r) => r.json())
      .then((json: { ok: boolean; message?: string; data?: { redirect: string } }) => {
        if (!json.ok || !json.data) {
          setError(json.message ?? "PIN galat hai");
          setPin("");
          setBusy(false);
          submittingRef.current = false;
          return;
        }
        router.push(next ?? json.data.redirect);
      })
      .catch(() => {
        setError("Network atka — dobara try karein.");
        setPin("");
        setBusy(false);
        submittingRef.current = false;
      });
  }, [pin, next, router]);

  const press = (key: string) => {
    setError(null);
    if (key === "clear") return setPin("");
    if (key === "del") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length >= 4 ? p : p + key));
  };

  return (
    <div className="mt-8">
      <div className="flex justify-center gap-3" aria-label={`PIN: ${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-[13px] w-[13px] rounded-full border transition-colors",
              i < pin.length ? "border-accent bg-accent" : "border-[var(--hairline-strong)] bg-transparent",
              error && "border-[rgba(196,83,43,.7)]",
            )}
          />
        ))}
      </div>
      <p className="mt-3 h-4 text-center text-[12px] text-[#f0b6a0]" aria-live="polite">{error}</p>

      <div className="mt-5 grid grid-cols-3 gap-2.5" role="group" aria-label="PIN keypad">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            disabled={busy}
            aria-label={key === "del" ? "Delete last digit" : key === "clear" ? "Clear" : `Digit ${key}`}
            className={cn(
              "grid h-[58px] place-items-center rounded-[14px] border border-[var(--hairline)] bg-white/[.035] text-[19px] text-cream-0 transition-colors hover:bg-white/[.075] active:scale-[.985]",
              key === "del" && "text-cream-1",
              key === "clear" && "text-[12px] uppercase tracking-[.08em] text-cream-2",
            )}
          >
            {key === "del" ? <Delete size={17} strokeWidth={1.5} /> : key === "clear" ? "clear" : key}
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-cream-2">
        Demo PINs: waiter 1111 · manager 2222 · kitchen 3333 · owner 4444
      </p>
    </div>
  );
}
