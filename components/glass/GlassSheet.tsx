"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sheet" | "panel" | "wide";
  label?: string;
};

/**
 * Bottom sheet on mobile, centred panel on desktop. Esc closes, focus is trapped,
 * focus restores to the trigger on close.
 */
export function GlassSheet({ open, onClose, title, description, children, footer, size = "sheet", label }: Props) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, button:not([data-sheet-close]), textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? panelRef.current)?.focus();
    }, 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(timer);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const width = size === "wide" ? "sm:max-w-3xl" : size === "panel" ? "sm:max-w-xl" : "sm:max-w-lg";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label ?? title}>
          <motion.div
            className="absolute inset-0 bg-black/55"
            style={{ backdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={cn(
              "glass-e3 relative w-full max-h-[92dvh] overflow-y-auto rounded-t-[26px] sm:rounded-[26px] outline-none",
              width,
              "border-x-0 border-b-0 sm:border-x sm:border-b",
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: reduce ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 pt-5 pb-3 bg-[linear-gradient(to_bottom,rgba(16,18,22,.96),rgba(16,18,22,.72)_70%,transparent)] backdrop-blur-md rounded-t-[26px]">
              <div className="min-w-0">
                {title && <h2 className="title text-cream-0">{title}</h2>}
                {description && <p className="mt-1 text-[13px] leading-snug text-cream-2">{description}</p>}
              </div>
              <button
                type="button"
                data-sheet-close
                onClick={onClose}
                aria-label="Close"
                className="btn btn-quiet -mr-2 -mt-1 h-11 w-11 shrink-0 px-0"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-5 pb-6">{children}</div>
            {footer && (
              <div className="sticky bottom-0 border-t border-[var(--hairline)] bg-[rgba(16,18,22,.86)] px-5 py-4 backdrop-blur-xl">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
