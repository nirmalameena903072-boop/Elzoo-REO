import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { PinPad } from "@/components/staff/PinPad";
import { VoludWordmark } from "@/components/brand/Marks";

export const dynamic = "force-dynamic";

export default async function StaffLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const session = await getStaffSession();
  if (session) redirect(next ?? (session.role === "KITCHEN" ? "/kitchen" : session.role === "OWNER" ? "/admin" : "/staff"));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6 py-12">
      <VoludWordmark className="h-[24px] w-auto text-cream-0" />
      <p className="micro mt-8 text-cream-2">Alsa · staff access</p>
      <h1 className="mt-3 text-[28px] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
        PIN daalein
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-cream-2">
        4 digit PIN. Roleus PIN se pata chal jaata hai — waiter, manager, kitchen ya owner.
      </p>
      <PinPad next={next ?? null} />
    </main>
  );
}
