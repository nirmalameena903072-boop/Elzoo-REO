# Volud

Restaurant service software, built as one app: guest menu and live order status, staff floor board,
kitchen display, owner analytics, and the 1-tap review flow. Demo tenant is **Alsa**, Kanpur.

```bash
npm install
npm run dev            # http://localhost:3000 — SQLite file seeds itself on first request
```

No env vars, no external keys, no payment gateway. `data/volud.db` is created and seeded the first
time anything touches the DB. Delete that file to start over.

## What to open

| Surface | Route | Notes |
| --- | --- | --- |
| Landing | `/` | Two pinned scroll scenes, built with Motion — no scroll-jacking |
| Demo launcher | `/demo` | Every surface in one place, plus the PINs |
| Guest | `/t/T5/menu` | Menu → cart → live order status → bill → review |
| Staff floor | `/staff` | Action queue with SLAs, section scoping, table grid |
| Kitchen | `/kitchen` | Station-filtered tickets, start / ready / recall, 86 panel |
| Owner | `/admin` | Revenue, menu engineering, heatmap, review inbox |
| Console | `/console` | Outlet list, MRR, churn risk |
| Print | `/print/bill/[billId]`, `/print/kot/[orderId]`, `/print/qr` | Thermal 80 mm + A4 QR cards |

Staff PINs: **1111** waiter · **2222** manager · **3333** kitchen · **4444** owner.

## The parts worth reading

**Money is integer paise everywhere.** No float touches a bill. `lib/utils/money.ts` formats, nothing else rounds.

**State changes are server-authoritative.** Every transition lives in `lib/domain/` and is guarded — an
order cannot go `PLACED → SERVED` because the UI asked nicely. Zod validates every request body; orders
and payment intents additionally require an `Idempotency-Key` header (8–120 chars).

**The review flow is the product.** A 4–5★ review is composed from the guest's own chips and sentence,
copied to their clipboard, then Google opens so they paste once. A 1–3★ review never leaves the
building: it routes private, issues a `SORRY-DESSERT` token, and raises a manager alert. The guest is
never told which path they took.

**Payments are simulated against a real seam.** `lib/payments/provider.ts` is the interface; the mock
settles after 3 seconds. UPI intents are genuine `upi://pay?...` strings rendered as a real QR. Cash is
confirmed by staff, never by the guest.

**A settled table stays reachable for 90 minutes** so the bill and the review still resolve to the
session that produced them, instead of minting an empty new one. See `resolveDiner` in
`lib/server/session-init.ts`.

## Design

Ink / cream / saffron, Fraunces for display and Inter for UI, both self-hosted in `app/fonts/`. Three
glass elevations (`e1`/`e2`/`e3`) defined once in `app/globals.css` and used sparingly — glass is for
things that float over content, not for every panel. Motion primitives live in `components/motion/`
and `components/glass/Tilt3D.tsx`; every one of them respects `prefers-reduced-motion`.

## Checks

```bash
npm run typecheck      # tsc --noEmit
npm run test           # vitest — seed integrity
npm run build
```
