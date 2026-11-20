"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Info } from "lucide-react";

type Toast = { id: number; text: string; tone?: "ok" | "info" };

const ToastCtx = createContext<{ push: (text: string, tone?: "ok" | "info") => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const reduce = useReducedMotion();

  const push = useCallback((text: string, tone: "ok" | "info" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, text, tone }]);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const t = window.setTimeout(() => setItems((prev) => prev.slice(1)), 3800);
    return () => window.clearTimeout(t);
  }, [items]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              role="status"
              aria-live="polite"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: reduce ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="glass-e3 max-w-[min(92vw,420px)] rounded-[14px] px-4 py-3 text-[13px] leading-snug text-cream-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,.8)]"
            >
              <span className="flex items-start gap-2.5">
                <span className="mt-[1px] text-[var(--color-mint)]">
                  {item.tone === "ok" ? <Check size={15} strokeWidth={2} /> : <Info size={15} strokeWidth={1.5} />}
                </span>
                <span>{item.text}</span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
