import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { db, ensureDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { suggestedReplies } from "@/lib/domain/reviews";
import { AdminShell } from "@/components/admin/AdminShell";
import { ReviewInbox, type ReviewRow } from "@/components/admin/ReviewInbox";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  await ensureDb();

  const rows = await db()
    .select({
      review: t.reviews,
      tableNumber: t.tables.number,
      serverName: t.staff.name,
    })
    .from(t.reviews)
    .leftJoin(t.sessions, eq(t.sessions.id, t.reviews.sessionId))
    .leftJoin(t.tables, eq(t.tables.id, t.sessions.tableId))
    .leftJoin(t.staff, eq(t.staff.id, t.reviews.servedByStaffId))
    .orderBy(desc(t.reviews.createdAt))
    .limit(60);

  const reviews: ReviewRow[] = rows.map(({ review, tableNumber, serverName }) => {
    const chips = JSON.parse(review.chips) as string[];
    return {
      id: review.id,
      rating: review.rating,
      route: review.route,
      chips,
      freeText: review.freeText,
      composed: review.composed ?? [chips.join(". "), review.freeText ?? ""].filter(Boolean).join(" "),
      couponCode: review.couponCode,
      createdAt: review.createdAt,
      resolvedAt: review.resolvedAt,
      reply: review.replyText,
      tableNumber: tableNumber ?? "—",
      guestName: null,
      serverName,
      googleClicked: review.googleClicked,
      suggestions: suggestedReplies(chips),
    };
  });

  return (
    <AdminShell
      active="reviews"
      title="Reviews"
      subtitle="The 1-tap flow decides what the public sees. You decide what happens next."
    >
      <ReviewInbox reviews={reviews} />
    </AdminShell>
  );
}
