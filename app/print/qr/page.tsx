import Link from "next/link";
import QRCode from "qrcode";
import { ensureDb } from "@/lib/db";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { getOutlet } from "@/lib/db/queries";
import { mintTableToken } from "@/lib/auth/table-token";
import { OUTLET_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

/** Twelve cards on one A4 — the thing an owner actually prints and puts on tables. */
export default async function PrintQr() {
  await ensureDb();
  const outlet = await getOutlet();
  const tables = await db().select().from(t.tables).orderBy(t.tables.number);

  const cards = await Promise.all(
    tables.map(async (table) => {
      const token = mintTableToken({ tableNumber: table.number, tableId: table.id, outletId: OUTLET_ID, v: 1 });
      const svg = await QRCode.toString(token, {
        type: "svg",
        margin: 0,
        width: 420,
        color: { dark: "#0A0B0D", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      });
      return { number: table.number, section: table.section, svg };
    }),
  );

  return (
    <div className="min-h-dvh bg-[#e9e5dc] px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-5 flex max-w-[190mm] items-center justify-between text-[12px] text-[#5b564c]">
        <span>{outlet?.name} · 12 table cards · A4</span>
        <Link href="/admin/qr" className="underline underline-offset-4">Back to admin</Link>
      </div>

      <div className="mx-auto grid max-w-[190mm] grid-cols-3 gap-3 print:gap-2">
        {cards.map((card) => (
          <div key={card.number} className="flex break-inside-avoid flex-col items-center rounded-[3mm] border border-[#d6d0c4] bg-white px-4 pb-4 pt-5 text-center text-[#141414]">
            <p className="text-[8px] tracking-[.24em] text-[#7a7468]">ALSA · TABLE</p>
            <p className="mt-1 text-[26px] font-semibold leading-none">{card.number}</p>
            <div className="mt-3 w-[70%]" dangerouslySetInnerHTML={{ __html: card.svg }} aria-label={`QR for ${card.number}`} />
            <p className="mt-3 text-[8.5px] leading-tight text-[#5b564c]">Scan to see the menu,<br />order, and pay.</p>
            <p className="mt-1.5 text-[7.5px] tracking-[.16em] text-[#9a9488]">{card.section}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
