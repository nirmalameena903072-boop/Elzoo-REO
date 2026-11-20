import Link from "next/link";
import { QrCode, UtensilsCrossed, ChefHat, BarChart3, MonitorCog, Printer, ArrowUpRight } from "lucide-react";
import { ensureDb } from "@/lib/db";
import { getOutlet, getTableByNumber } from "@/lib/db/queries";
import { mintTableToken } from "@/lib/auth/table-token";
import { AlsaWordmark, VoludWordmark } from "@/components/brand/Marks";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

const surfaces = [
  {
    href: "/t/T5",
    label: "Customer · T5",
    note: "Menu, live status, split bill, review",
    icon: UtensilsCrossed,
    span: "sm:col-span-2",
    device: "Mobile",
  },
  { href: "/staff", label: "Staff floor", note: "Action queue, tables, SLA", icon: QrCode, span: "", device: "Tablet" },
  { href: "/kitchen", label: "Kitchen display", note: "Station tickets, bump, 86", icon: ChefHat, span: "", device: "Landscape" },
  { href: "/admin", label: "Owner", note: "Revenue, menu matrix, reviews", icon: BarChart3, span: "", device: "Desktop" },
  { href: "/console", label: "Volud console", note: "Outlets, MRR, churn risk", icon: MonitorCog, span: "", device: "Desktop" },
  { href: "/print/qr", label: "Print kit", note: "Table cards, KOT, GST invoice", icon: Printer, span: "", device: "A4" },
];

const pins = [
  { role: "Waiter", pin: "1111", who: "Rita Yadav · Section A" },
  { role: "Manager", pin: "2222", who: "Meera Sethi · whole floor" },
  { role: "Kitchen", pin: "3333", who: "Hari Prasad · KDS" },
  { role: "Owner", pin: "4444", who: "Aditya Raghav · everything" },
];

export default async function DemoPage() {
  await ensureDb();
  const outlet = await getOutlet();
  const t5 = await getTableByNumber("T5");
  const token = outlet && t5
    ? mintTableToken({ outletId: outlet.id, tableId: t5.id, tableNumber: t5.number, v: t5.qrVersion })
    : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1180px] px-5 pb-24 pt-10 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" aria-label="Volud home" className="flex items-center gap-3">
          <VoludWordmark className="h-[26px] w-auto" />
        </Link>
        <p className="micro text-cream-2">Demo tenant · Alsa · Kanpur</p>
      </header>

      <div className="mt-14 flex flex-col gap-6 sm:mt-20">
        <div>
          <p className="micro text-accent">Open any surface</p>
          <h1 className="display-l mt-3 max-w-[18ch]">
            Six screens, one service, already running.
          </h1>
        </div>
        <p className="max-w-[52ch] text-[15px] leading-relaxed text-cream-1">
          Everything below reads the same database. Place an order as the customer and it appears on the
          floor within three seconds — no refresh, no login for the diner.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <AlsaWordmark className="h-[22px] w-auto opacity-70" />
          <span className="text-[12px] text-cream-2">·</span>
          <span className="mono text-[12px] text-cream-2">
            {token ? `token · T5 · ${t5?.qrVersion}` : "token unavailable"}
          </span>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {surfaces.map((surface, i) => (
          <Reveal key={surface.href} delay={i * 45} className={surface.span}>
            <Link
              href={surface.href}
              className="glass-e1 glass-hover group flex h-full flex-col justify-between gap-8 p-5 focus-visible:outline-none sm:p-6"
            >
              <div className="flex items-start justify-between">
                <surface.icon size={20} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
                <ArrowUpRight size={16} strokeWidth={1.5} className="text-cream-2 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <div>
                <p className="flex items-center gap-2 text-[15px] font-medium text-cream-0">
                  {surface.label}
                  <span className="micro rounded-full border border-[var(--hairline)] px-2 py-[3px] text-[9px] text-cream-2">{surface.device}</span>
                </p>
                <p className="mt-1 text-[13px] text-cream-2">{surface.note}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>

      <section className="mt-16 sm:mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="title">Staff PINs</h2>
          <p className="text-[12px] text-cream-2">4 digits · 12 hour session</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pins.map((p) => (
            <div key={p.role} className="glass-e1 rounded-[16px] p-4">
              <p className="micro text-cream-2">{p.role}</p>
              <p className="mono mt-2 text-[26px] leading-none text-cream-0">{p.pin}</p>
              <p className="mt-2 text-[11px] leading-snug text-cream-2">{p.who}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--hairline)] pt-6">
        <p className="text-[12px] text-cream-2">Sample build. Payments simulated — no money moves.</p>
        <div className="flex items-center gap-4 text-[12px]">
          <Link href="/staff/login" className="text-cream-1 underline decoration-[var(--hairline-strong)] underline-offset-4 hover:text-cream-0">Staff login</Link>
          <Link href="/api/health" className="text-cream-1 underline decoration-[var(--hairline-strong)] underline-offset-4 hover:text-cream-0">Health</Link>
        </div>
      </footer>
    </main>
  );
}
