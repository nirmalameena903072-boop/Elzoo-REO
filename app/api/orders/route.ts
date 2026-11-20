import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson, requireIdempotencyKey } from "@/lib/http";
import { deviceIdForRequest, resolveDiner } from "@/lib/server/session-init";
import { placeOrder } from "@/lib/domain/orders";
import { DomainError } from "@/lib/domain/errors";

export const dynamic = "force-dynamic";

const Schema = z.object({
  tableNumber: z.string().regex(/^T\d{1,2}$/i),
  lines: z
    .array(
      z.object({
        menuItemId: z.string().min(3).max(60),
        qty: z.number().int().min(1).max(20),
        notes: z.string().max(80).nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
  note: z.string().max(140).nullable().optional(),
});

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const key = requireIdempotencyKey(request);
    const body = Schema.parse(await readJson(request));
    const deviceId = await deviceIdForRequest();

    if (!/^T\d{1,2}$/i.test(body.tableNumber)) throw new DomainError("VALIDATION", "Table theek nahi hai.", 400);
    const diner = await resolveDiner(body.tableNumber.toUpperCase(), deviceId);
    if (diner.session.state !== "OPEN") {
      throw new DomainError("CONFLICT", "Is table ka bill ban chuka hai — waiter se naya session khulwayein.", 409);
    }

    const { order, items, reused } = await placeOrder({
      sessionId: diner.session.id,
      tableId: diner.table.id,
      guestId: diner.guest.id,
      outletId: diner.outlet.id,
      lines: body.lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty, notes: l.notes ?? null })),
      note: body.note ?? null,
      idempotencyKey: key,
    });

    return ok({
      orderId: order.id,
      number: order.number,
      state: order.state,
      totalPaise: order.totalPaise,
      reused,
      items: items.map((i) => ({ id: i.id, name: i.nameSnapshot, qty: i.qty, state: i.state })),
    });
  });
}
