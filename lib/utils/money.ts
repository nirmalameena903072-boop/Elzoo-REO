/** All money in integer paise. ₹280.00 -> 28000. */
export const rupee = (amount: number): string => {
  const sign = amount < 0 ? "−" : "";
  const abs = Math.abs(Math.round(amount));
  const r = Math.floor(abs / 100);
  const p = abs % 100;
  const grouped = r.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return p === 0 ? `${sign}₹${grouped}` : `${sign}₹${grouped}.${String(p).padStart(2, "0")}`;
};

export const rupeesToPaise = (r: number): number => Math.round(r * 100);

/** Split an amount into n parts whose integer sum is exactly the amount. Remainder lands on the first parts. */
export function splitEqually(totalPaise: number, ways: number): number[] {
  if (ways < 1) return [];
  const base = Math.floor(totalPaise / ways);
  const remainder = totalPaise - base * ways;
  return Array.from({ length: ways }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** 5% GST stored as a percent with up to 2 decimals (5, 12.5). Half-up paise rounding. */
export function taxOn(subtotalPaise: number, pct: number): number {
  return Math.round((subtotalPaise * pct) / 100);
}

export function sum(amounts: number[]): number {
  return amounts.reduce((a, b) => a + b, 0);
}
