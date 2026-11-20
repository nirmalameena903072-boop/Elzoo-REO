import { Plus } from "lucide-react";

/**
 * A miniature of the real diner screen — same type scale relationships, same colours,
 * built from markup so it never rots into a stale screenshot.
 */
export function MiniMenu() {
  const items = [
    { name: "Dal Makhani", hi: "दाल मखानी", price: "₹380", tag: "CHEF'S PICK", veg: true },
    { name: "Paneer Tikka", hi: "पनीर टिक्का", price: "₹320", tag: null, veg: true },
    { name: "Butter Chicken", hi: "बटर चिकन", price: "₹420", tag: null, veg: false },
  ];

  return (
    <div className="px-3">
      <div className="flex items-center justify-between">
        <span className="micro text-[6px] text-cream-2">T5 · ALSA</span>
        <span className="mono text-[6px] text-cream-2">2 guests</span>
      </div>
      <p className="mt-2 text-[15px] leading-[1.05] tracking-[-0.02em] text-cream-0" style={{ fontFamily: "var(--font-display)" }}>
        Aaj kya
        <br />
        khayenge?
      </p>

      <div className="mt-2.5 flex gap-1">
        {["Small", "Mains", "Breads"].map((tab, i) => (
          <span
            key={tab}
            className={
              i === 0
                ? "rounded-full border border-[rgba(232,164,85,.45)] bg-[rgba(232,164,85,.12)] px-1.5 py-[2px] text-[5.5px] text-[#f5dfc2]"
                : "rounded-full border border-[var(--hairline)] px-1.5 py-[2px] text-[5.5px] text-cream-2"
            }
          >
            {tab}
          </span>
        ))}
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.name} className="flex items-center gap-2 rounded-[7px] border border-[var(--hairline)] bg-white/[.025] p-1.5">
            <div
              className="h-[30px] w-[30px] shrink-0 rounded-[5px]"
              style={{
                background: item.veg
                  ? "linear-gradient(140deg,#E8A455 0%,#8a5a2a 60%,#2a1d12 100%)"
                  : "linear-gradient(140deg,#C4532B 0%,#7a2f18 60%,#2a1410 100%)",
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[7px] leading-tight text-cream-0">{item.name}</p>
              <p className="truncate text-[6px] leading-tight text-cream-2">{item.hi}</p>
              {item.tag && <p className="mt-[1px] text-[4.5px] tracking-[.1em] text-accent">{item.tag}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-[3px]">
              <span className="mono text-[6.5px] text-cream-1">{item.price}</span>
              <span className="grid h-[11px] w-[11px] place-items-center rounded-full border border-[var(--hairline-strong)]">
                <Plus size={6} strokeWidth={2.4} className="text-cream-1" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-[6px] bg-[rgba(232,164,85,.14)] px-2 py-1.5">
        <span className="text-[6px] text-[#f5dfc2]">2 items · ₹700</span>
        <span className="text-[6px] text-[#f5dfc2]">View cart →</span>
      </div>
    </div>
  );
}
