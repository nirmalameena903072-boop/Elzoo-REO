import Link from "next/link";
import { ArrowRight, ArrowUpRight, Star } from "lucide-react";
import { VoludWordmark } from "@/components/brand/Marks";
import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { Tilt3D } from "@/components/glass/Tilt3D";
import { SceneService, SceneReview } from "@/components/marketing/Scenes";
import { PhoneChrome, PhoneFrame } from "@/components/marketing/PhoneFrame";
import { MiniMenu } from "@/components/marketing/MiniMenu";

export const dynamic = "force-static";

const SURFACES = [
  { href: "/demo", label: "Demo launcher", note: "Every surface, one click", tag: "start here" },
  { href: "/t/T5/menu", label: "Guest menu", note: "Live table, real cart", tag: "mobile" },
  { href: "/staff", label: "Floor", note: "Queue, SLA, tables", tag: "tablet" },
  { href: "/kitchen", label: "Kitchen", note: "Station tickets", tag: "landscape" },
  { href: "/admin", label: "Owner", note: "Revenue, reviews", tag: "desktop" },
  { href: "/console", label: "Console", note: "Outlets, MRR", tag: "internal" },
];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-6 sm:px-8">
        <VoludWordmark className="h-[24px] w-auto text-cream-0" />
        <nav className="flex items-center gap-1" aria-label="Primary">
          <Link href="/demo" className="btn btn-quiet h-9 px-3 text-[12.5px]">Demo</Link>
          <Link href="/staff/login" className="btn btn-quiet h-9 px-3 text-[12.5px]">Staff</Link>
          <Link href="/t/T5/menu" className="btn btn-primary ml-1 h-9 px-4 text-[12.5px]">
            Open table <ArrowUpRight size={13} strokeWidth={1.8} />
          </Link>
        </nav>
      </header>

      {/* ── hero: type first, one object, no dashboard collage ───────────── */}
      <section className="relative mx-auto w-full max-w-[1180px] px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="micro text-accent">Service software · Kanpur</p>
            <h1 className="display-l mt-4 max-w-[19ch] text-[clamp(2.5rem,6.2vw,4.25rem)] leading-[0.98] tracking-[-0.03em]">
              <WordReveal text="The restaurant runs. Nobody shouts." />
            </h1>
            <Reveal delay={220}>
              <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.65] text-cream-1">
                Guests order from the table. The kitchen sees only its own station. The floor gets one
                queue instead of four. And when the bill settles, the review is already half-written.
              </p>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Link href="/demo" className="btn btn-primary h-11 px-5 text-[13.5px]">
                  See it running <ArrowRight size={14} strokeWidth={1.8} />
                </Link>
                <Link href="/admin" className="btn btn-ghost h-11 px-4 text-[13.5px]">
                  Owner view
                </Link>
              </div>
              <p className="mt-3.5 flex items-center gap-1.5 text-[11.5px] text-cream-2">
                <span className="live-dot" aria-hidden="true" />
                Seeded with a real service — no signup, no keys, no card.
              </p>
            </Reveal>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div
              className="absolute -inset-10 -z-10 rounded-full opacity-70 blur-2xl"
              style={{ background: "radial-gradient(closest-side, rgba(232,164,85,.16), transparent)" }}
              aria-hidden="true"
            />
            <Tilt3D max={7} className="w-fit">
              <PhoneFrame>
                <PhoneChrome />
                <MiniMenu />
              </PhoneFrame>
            </Tilt3D>
            <div className="absolute -bottom-3 left-1/2 hidden w-[230px] -translate-x-1/2 translate-y-full text-center sm:block lg:left-auto lg:right-8">
              <p className="text-[11px] leading-relaxed text-cream-2">
                T5 · Alsa, Kanpur<br />
                <span className="text-cream-1">this is the actual seeded table</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── pinned scene 1: the handoff ──────────────────────────────────── */}
      <SceneService />

      {/* ── the surfaces, as a plain index — no card grid of fake screenshots ── */}
      <section className="mx-auto w-full max-w-[1180px] px-5 py-20 sm:px-8">
        <div className="flex flex-col gap-8 border-t border-[var(--hairline)] pt-8 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-[24ch] text-[clamp(1.5rem,3vw,2.1rem)] leading-[1.1] tracking-[-0.02em]">
            Eight surfaces. One database. No second app to keep in sync.
          </h2>
          <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-cream-2">
            Everything here reads and writes the same SQLite file. Place an order as the guest and it
            is on the pass before you finish reading this sentence.
          </p>
        </div>

        <ul className="mt-8 divide-y divide-[var(--hairline)]">
          {SURFACES.map((s, i) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group flex items-center gap-4 py-4 transition-colors hover:bg-white/[.02] sm:gap-6 sm:px-2"
              >
                <span className="mono w-5 shrink-0 text-[10.5px] text-cream-2/60">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-cream-0 transition-transform duration-300 group-hover:translate-x-1">{s.label}</span>
                  <span className="mt-0.5 block text-[12px] text-cream-2">{s.note}</span>
                </span>
                <span className="micro hidden shrink-0 rounded-full border border-[var(--hairline)] px-2.5 py-1 text-[9px] text-cream-2 sm:block">
                  {s.tag}
                </span>
                <ArrowUpRight size={15} strokeWidth={1.5} className="shrink-0 text-cream-2 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-cream-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── pinned scene 2: the review split ─────────────────────────────── */}
      <SceneReview />

      {/* ── the honest paragraph + close ─────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1180px] px-5 py-20 sm:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="micro text-cream-2">What this is</p>
            <h2 className="mt-3 max-w-[22ch] text-[clamp(1.5rem,2.8vw,2rem)] leading-[1.12] tracking-[-0.02em]">
              A working demo build, not a pitch deck.
            </h2>
            <p className="mt-4 max-w-[46ch] text-[13.5px] leading-[1.7] text-cream-1">
              Payments are simulated against a mock provider — an intent is created, a UPI string is
              real, a webhook settles it three seconds later. No money moves and no gateway is called.
              Everything else is real: the state machine, the Zod validation, the idempotency keys, the
              audit trail on discounts.
            </p>
            <p className="mt-3 max-w-[46ch] text-[13.5px] leading-[1.7] text-cream-1">
              The seed is 14 days of service at Alsa, Kanpur — 64 settled bills, a genuinely mediocre
              Tuesday, and 20 reviews that don&rsquo;t all say &ldquo;amazing&rdquo;.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { k: "Zero config", v: "SQLite file, seeded on first page load. No .env required." },
              { k: "Server-authoritative", v: "Every state change is a guarded transition, never a client guess." },
              { k: "Money in paise", v: "Integers end to end. No floats touch a bill." },
              { k: "Reviews, routed", v: "4–5 goes public with the guest's words. 1–3 stays private, always." },
            ].map((row) => (
              <div key={row.k} className="flex items-start gap-4 rounded-[12px] border border-[var(--hairline)] px-4 py-3.5">
                <Star size={13} strokeWidth={1.4} className="mt-[3px] shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-[12.5px] text-cream-0">{row.k}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-cream-2">{row.v}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start gap-4 border-t border-[var(--hairline)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[30ch] text-[15px] leading-snug text-cream-1">
            Open the demo. Order a dal. Watch it hit the pass.
          </p>
          <Link href="/demo" className="btn btn-primary h-11 px-5 text-[13.5px]">
            Open the demo <ArrowRight size={14} strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 border-t border-[var(--hairline)] px-5 py-7 text-[11.5px] text-cream-2 sm:px-8">
        <span>Volud · sample build · payments simulated</span>
        <div className="flex items-center gap-4">
          <Link href="/demo" className="hover:text-cream-1">Demo</Link>
          <Link href="/console" className="hover:text-cream-1">Console</Link>
          <Link href="/api/health" className="hover:text-cream-1">Health</Link>
        </div>
      </footer>
    </main>
  );
}
