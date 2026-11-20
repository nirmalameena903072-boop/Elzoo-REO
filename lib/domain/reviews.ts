import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { DomainError } from "@/lib/domain/errors";
import { newId } from "@/lib/utils/ids";
import { moderateReview } from "@/lib/utils/html";

const DAY = 86_400_000;

export type ReviewInput = {
  sessionId: string;
  billId: string;
  rating: number;
  chips: string[];
  freeText?: string | null;
  deviceHash: string;
};

export type RoutedReview = {
  review: t.Review;
  route: t.ReviewRoute;
  coupon: t.Coupon | null;
  message: { hi: string; en: string };
  googleUrl: string | null;
};

/**
 * Routing is a server decision, not a UI one.
 * 5★ SAVE10 → GOOGLE · 4★ THANKS5 → GOOGLE · 3 PRIVATE · 2 PRIVATE + sorry token · 1 PRIVATE urgent.
 */
export async function submitReview(input: ReviewInput): Promise<RoutedReview> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new DomainError("VALIDATION", "Rating 1 se 5 ke beech honi chahiye.", 400);
  }
  const existing = await db().select().from(t.reviews).where(eq(t.reviews.sessionId, input.sessionId)).limit(1);
  if (existing[0]) throw new DomainError("CONFLICT", "Is table se review already aa chuka hai.", 409);

  const session = (await db().select().from(t.sessions).where(eq(t.sessions.id, input.sessionId)).limit(1))[0];
  const bill = (await db().select().from(t.bills).where(eq(t.bills.id, input.billId)).limit(1))[0];
  if (!session || !bill) throw new DomainError("NOT_FOUND", "Session ya bill nahi mila.", 404);
  if (bill.state !== "PAID") throw new DomainError("CONFLICT", "Review payment ke baad hi hota hai.", 409);

  const outlet = (await db().select().from(t.outlets).where(eq(t.outlets.id, session.outletId)).limit(1))[0]!;
  const servedBy = (await db().select().from(t.orders).where(eq(t.orders.sessionId, input.sessionId)).limit(1))[0]?.staffId ?? null;

  const clean = moderateReview(input.freeText ?? "");
  const chips = input.chips.filter((c) => typeof c === "string" && c.length <= 48).slice(0, 6);
  const parts = [...chips, clean.text].filter(Boolean).map((piece) => piece.trim().replace(/\.+$/, "").trim());
  const composed = parts.length ? `${parts.join(". ")}.` : "";

  const route: t.ReviewRoute = input.rating >= 4 ? "GOOGLE" : "PRIVATE";
  const now = Date.now();
  const id = newId("rev");

  let couponCode: string | null = null;
  let coupon: t.Coupon | null = null;
  let message = { hi: "", en: "" };

  if (input.rating === 5) {
    couponCode = "SAVE10";
    coupon = { id: newId("cpn"), outletId: session.outletId, code: couponCode, kind: "PERCENT", value: 10, label: "10% off your next visit", minBillPaise: 0, validUntil: now + 30 * DAY, used: false, reviewId: id };
    message = { hi: "Shukriya. Aapki agli visit pe 10% off — code neeche hai.", en: "Thanks. 10% off your next visit — code below." };
  } else if (input.rating === 4) {
    couponCode = "THANKS5";
    coupon = { id: newId("cpn"), outletId: session.outletId, code: couponCode, kind: "PERCENT", value: 5, label: "5% off your next visit", minBillPaise: 0, validUntil: now + 30 * DAY, used: false, reviewId: id };
    message = { hi: "Achha laga sunke. Agli visit pe 5% off.", en: "Glad you liked it. 5% off next time." };
  } else if (input.rating === 3) {
    message = { hi: "Feedback ke liye shukriya — hum ispe kaam karenge.", en: "Thanks for the feedback — we'll work on it." };
  } else if (input.rating === 2) {
    couponCode = "SORRY-DESSERT";
    coupon = { id: newId("cpn"), outletId: session.outletId, code: couponCode, kind: "ITEM", value: 0, label: "Free dessert, next visit", minBillPaise: 0, validUntil: now + 30 * DAY, used: false, reviewId: id };
    message = { hi: "Manager 10 minute mein aapke table pe aayega. Next visit pe dessert humari taraf se.", en: "A manager will be at your table in 10 minutes. Free dessert on us next time." };
  } else {
    couponCode = "SORRY-DESSERT";
    coupon = { id: newId("cpn"), outletId: session.outletId, code: couponCode, kind: "ITEM", value: 0, label: "Free dessert, next visit", minBillPaise: 0, validUntil: now + 30 * DAY, used: false, reviewId: id };
    message = { hi: "Aapki baat manager ko abhi pahunch gayi hai. Next visit pe dessert humari taraf se.", en: "Your note went straight to the manager. Free dessert on us next time." };
  }

  const review = {
    id, outletId: session.outletId, sessionId: input.sessionId, billId: input.billId,
    servedByStaffId: servedBy, rating: input.rating, chips: JSON.stringify(chips),
    freeText: clean.text || null, composed, route, couponCode,
    managerAlertAt: input.rating <= 3 ? now : null, resolvedAt: null, replyText: null,
    googleClicked: false, held: clean.held, deviceHash: input.deviceHash, createdAt: now,
  };
  await db().insert(t.reviews).values(review);
  if (coupon) await db().insert(t.coupons).values(coupon);

  const googleUrl = outlet.googlePlaceId
    ? `https://search.google.com/local/writereview?place_id=${encodeURIComponent(outlet.googlePlaceId)}`
    : null;

  return {
    review: { ...review },
    route,
    coupon,
    message,
    googleUrl: route === "GOOGLE" ? googleUrl : null,
  };
}

export async function markGoogleClicked(reviewId: string) {
  await db().update(t.reviews).set({ googleClicked: true }).where(eq(t.reviews.id, reviewId));
  return { ok: true };
}

export async function replyToReview(reviewId: string, reply: string, staffId: string) {
  const text = moderateReview(reply, 400).text;
  if (text.trim().length < 2) throw new DomainError("VALIDATION", "Reply khali nahi ho sakta.", 400);
  const review = (await db().select().from(t.reviews).where(eq(t.reviews.id, reviewId)).limit(1))[0];
  if (!review) throw new DomainError("NOT_FOUND", "Review mila nahi.", 404);
  await db().update(t.reviews).set({ replyText: text }).where(eq(t.reviews.id, reviewId));
  await db().insert(t.auditLog).values({
    id: newId("aud"), outletId: review.outletId, staffId, action: "review.replied",
    entity: "review", entityId: reviewId, meta: JSON.stringify({ rating: review.rating }), createdAt: Date.now(),
  });
  return { ok: true, replyText: text };
}

export async function resolveReview(reviewId: string, staffId: string) {
  const review = (await db().select().from(t.reviews).where(eq(t.reviews.id, reviewId)).limit(1))[0];
  if (!review) throw new DomainError("NOT_FOUND", "Review mila nahi.", 404);
  await db().update(t.reviews).set({ resolvedAt: Date.now() }).where(eq(t.reviews.id, reviewId));
  await db().insert(t.auditLog).values({
    id: newId("aud"), outletId: review.outletId, staffId, action: "review.resolved",
    entity: "review", entityId: reviewId, meta: "{}", createdAt: Date.now(),
  });
  return { ok: true };
}

/** Draft replies composed from the chips the guest actually picked. Manager can edit before sending. */
export function suggestedReplies(chips: string[]): string[] {
  const has = (needle: string) => chips.some((c) => c.toLowerCase().includes(needle));
  const out: string[] = [];
  if (has("thanda") || has("cold")) {
    out.push("Sorry khana thanda aaya — humne kitchen ko retrain kiya hai. Aapki agli visit humari taraf se.");
  }
  if (has("wait") || has("dhyaan")) {
    out.push("Wait ke liye maafi. Peak hours mein staff badha rahe hain — aap agli baar zyada comfortable honge.");
  }
  if (has("chhota") || has("portion") || has("mehnga") || has("overpriced")) {
    out.push("Portion aur price pe aapki baat sahi hai — humne plates ka size revisit kiya hai. Feedback ke liye shukriya.");
  }
  if (has("galat") || has("wrong") || has("bill")) {
    out.push("Order ki gadbad humari galti thi — bill check kar liya hai aur process tight kiya hai. Sorry.");
  }
  if (out.length === 0) {
    out.push("Aapke feedback ke liye shukriya. Hum ispe kaam kar rahe hain aur agli visit better banayenge.");
    out.push("Bataane ke liye thank you — manager ne note le liya hai aur team ko brief kiya hai.");
  }
  return out.slice(0, 3);
}

export function chipFrequency(reviews: Array<{ chips: string; rating: number }>) {
  const counts = new Map<string, number>();
  for (const r of reviews) {
    try {
      const chips = JSON.parse(r.chips) as string[];
      for (const chip of chips) counts.set(chip, (counts.get(chip) ?? 0) + 1);
    } catch {
      // a malformed chip array should never break the inbox
    }
  }
  const total = reviews.length || 1;
  return [...counts.entries()]
    .map(([chip, n]) => ({ chip, count: n, share: Math.round((n / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
