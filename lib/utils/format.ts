/** Order totals in the app use "₹740" / "12m 40s" / "4.6★" consistently. */
export function rating(r: number): string {
  return `${r.toFixed(1)}★`;
}

export function pct(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function initials(name: string | null): string {
  if (!name || !name.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
