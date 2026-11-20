import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { submitReview } from "@/lib/domain/reviews";

export const dynamic = "force-dynamic";

const Schema = z.object({
  sessionId: z.string().min(4),
  billId: z.string().min(4),
  rating: z.number().int().min(1).max(5),
  chips: z.array(z.string().max(48)).max(6).default([]),
  freeText: z.string().max(400).nullable().optional(),
});

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const body = Schema.parse(await readJson(request));
    const routed = await submitReview({
      sessionId: body.sessionId,
      billId: body.billId,
      rating: body.rating,
      chips: body.chips,
      freeText: body.freeText ?? null,
      deviceHash: "device",
    });
    return ok({
      reviewId: routed.review.id,
      route: routed.route,
      couponCode: routed.coupon?.code ?? null,
      couponLabel: routed.coupon?.label ?? null,
      googleUrl: routed.googleUrl,
      message: routed.message.hi,
      composed: routed.review.composed,
    });
  });
}
