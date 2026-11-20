import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, ensureDb } from "@/lib/db";
import { bills } from "@/lib/db/schema";
import { deviceIdForRequest, resolveSettledOrDiner } from "@/lib/server/session-init";
import { getReviewBySession } from "@/lib/db/queries";
import { ReviewFlow } from "@/components/diner/ReviewFlow";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureDb();
  if (!/^T\d{1,2}$/i.test(token)) notFound();

  const deviceId = await deviceIdForRequest();
  const diner = await resolveSettledOrDiner(token.toUpperCase(), deviceId);

  const billRows = await db()
    .select()
    .from(bills)
    .where(eq(bills.sessionId, diner.session.id))
    .orderBy(desc(bills.createdAt))
    .limit(1);
  const bill = billRows[0] ?? null;
  const existing = await getReviewBySession(diner.session.id);

  return (
    <ReviewFlow
      tableNumber={token.toUpperCase()}
      sessionId={diner.session.id}
      billId={bill?.state === "PAID" ? bill.id : null}
      billTotalPaise={bill?.totalPaise ?? 0}
      alreadyReviewed={!!existing}
      existing={
        existing
          ? {
              rating: existing.rating,
              route: existing.route,
              couponCode: existing.couponCode,
              chips: JSON.parse(existing.chips) as string[],
            }
          : null
      }
      guestName={diner.guest.name}
    />
  );
}
