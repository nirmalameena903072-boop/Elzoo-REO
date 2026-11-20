import type { ReactNode } from "react";

/**
 * Thermal-paper shell. Deliberately light-on-white even in a dark app — this screen
 * is a preview of a physical object, so it obeys paper, not the product's theme.
 */
export function Paper({ children, width = 78 }: { children: ReactNode; width?: 58 | 78 }) {
  return (
    <div className="min-h-dvh bg-[#e9e5dc] px-3 py-6 print:min-h-0 print:bg-white print:p-0">
      <div
        className="mx-auto w-full bg-white px-5 py-6 text-[#141414] shadow-[0_18px_50px_-20px_rgba(0,0,0,.5)] print:shadow-none"
        style={{ maxWidth: width === 78 ? "80mm" : "58mm" }}
      >
        {children}
      </div>
      <div className="no-print mx-auto mt-5 flex max-w-[80mm] items-center justify-between gap-2 text-[11px] text-[#5b564c]">
        <span>{width}mm thermal</span>
        <span>Ctrl / Cmd + P</span>
      </div>
    </div>
  );
}

export function PaperRule({ dashed = false }: { dashed?: boolean }) {
  return <div className={`my-3 border-t ${dashed ? "border-dashed border-[#b8b2a6]" : "border-[#141414]"}`} />;
}

export function PaperRow({
  left,
  right,
  bold = false,
  size = "base",
}: {
  left: string;
  right: string;
  bold?: boolean;
  size?: "base" | "lg" | "sm";
}) {
  const cls = size === "lg" ? "text-[15px]" : size === "sm" ? "text-[10.5px]" : "text-[12px]";
  return (
    <div className={`flex items-baseline justify-between gap-3 ${cls} ${bold ? "font-semibold" : ""}`}>
      <span className="min-w-0">{left}</span>
      <span className="mono shrink-0 tabular-nums">{right}</span>
    </div>
  );
}
