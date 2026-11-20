import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ensureDb } from "@/lib/db";
import { getOutlet } from "@/lib/db/queries";
import { mintTableToken } from "@/lib/auth/table-token";
import { OUTLET_ID } from "@/lib/db/constants";

export const dynamic = "force-dynamic";

export default async function PrintSingleQr({ params }: { params: Promise<{ token: string }> }) {
  await ensureDb();
  const { token } = await params;
  const tableNumber = token.toUpperCase();
  if (!/^T\d{1,2}$/.test(tableNumber)) notFound();
  const outlet = await getOutlet();
  const signed = mintTableToken({ tableNumber, tableId: `tbl_${tableNumber.toLowerCase()}`, outletId: OUTLET_ID, v: 1 });
  const svg = await QRCode.toString(signed, { type: "svg", margin: 0, width: 800, color: { dark: "#0A0B0D", light: "#FFFFFF" }, errorCorrectionLevel: "M" });

  return (
    <div className="min-h-dvh bg-[#e9e5dc] px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto flex aspect-[3/4] w-full max-w-[110mm] flex-col items-center justify-between rounded-[4mm] border border-[#d6d0c4] bg-white px-7 pb-9 pt-10 text-center text-[#141414]">
        <div>
          <p className="text-[9px] tracking-[.26em] text-[#7a7468]">{outlet?.name.toUpperCase()}</p>
          <p className="mt-3 text-[54px] font-semibold leading-none">{tableNumber}</p>
          <p className="mt-2 text-[10px] text-[#5b564c]">Table</p>
        </div>
        <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR for ${tableNumber}`} />
        <div>
          <p className="text-[10px] leading-relaxed text-[#5b564c]">Scan · order · pay · review</p>
          <p className="mt-1 text-[8px] tracking-[.2em] text-[#9a9488]">{outlet?.phone}</p>
        </div>
      </div>
      <p className="no-print mx-auto mt-4 max-w-[110mm] text-center text-[11px] text-[#5b564c]">A5 card · print on 210 gsm</p>
    </div>
  );
}
