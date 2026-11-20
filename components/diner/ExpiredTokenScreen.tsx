import Link from "next/link";
import { AlsaWordmark } from "@/components/brand/Marks";

export function ExpiredTokenScreen({ reason }: { reason: "malformed" | "signature" | "expired" }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <AlsaWordmark className="h-[30px] w-auto text-cream-0" />
      <h1 className="mt-10 max-w-[20ch] text-[26px] leading-tight text-cream-0">
        Yeh QR purana hai, staff ko bulao
      </h1>
      <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed text-cream-1">
        {reason === "expired"
          ? "Table ka QR har din badalta hai. Aaj ka card table pe laga hua hai — ya seedha waiter ko bula lein."
          : "Yeh link poora nahi hai. Table pe laga QR dobara scan karein, ya waiter ko bula lein."}
      </p>
      <Link href="/demo" className="btn btn-ghost mt-8">Staff ko bulao</Link>
      <p className="mono mt-12 text-[11px] text-cream-2">alsa · Civil Lines, Kanpur</p>
    </main>
  );
}
