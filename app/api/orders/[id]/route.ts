import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { deviceIdForRequest, resolveDiner } from "@/lib/server/session-init";
import { getOrderWithItems } from "@/lib/db/queries";
import { cancelItemByCustomer, cancelOrderByCustomer } from "@/lib/domain/orders";
import { DomainError } from "@/lib/domain/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  return handle(async () => {
    await ensureDb();
    const { id } = await params;
    const found = await getOrderWithItems(id);
    if (!found) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
    return ok({
      serverNow: Date.now(),
      order: {
        id: found.order.id,
        number: found.order.number,
        state: found.order.state,
        totalPaise: found.order.totalPaise,
        placedAt: found.order.placedAt,
        acceptedAt: found.order.acceptedAt,
        readyAt: found.order.readyAt,
        servedAt: found.order.servedAt,
        rejectReason: found.order.rejectReason,
        rejectNote: found.order.rejectNote,
        note: found.order.note,
      },
      table: found.table ? { number: found.table.number } : null,
      items: found.items.map((i) => ({
        id: i.id,
        name: i.nameSnapshot,
        qty: i.qty,
        notes: i.notes,
        state: i.state,
        station: i.station,
        prepMinutes: i.prepMinutes,
        startedAt: i.startedAt,
        readyAt: i.readyAt,
      })),
    });
  });
}

const PatchSchema = z.object({
  action: z.enum(["cancel", "cancel-item"]),
  itemId: z.string().optional(),
});

export async function PATCH(request: Request, { params }: Ctx) {
  return handle(async () => {
    await ensureDb();
    const { id } = await params;
    const body = PatchSchema.parse(await readJson(request));
    const deviceId = await deviceIdForRequest();
    const found = await getOrderWithItems(id);
    if (!found || !found.table) throw new DomainError("NOT_FOUND", "Order mila nahi.", 404);
    const diner = await resolveDiner(found.table.number, deviceId);

    if (body.action === "cancel-item" && body.itemId) {
      const result = await cancelItemByCustomer(body.itemId, diner.session.id);
      return ok(result);
    }
    const result = await cancelOrderByCustomer(id, diner.session.id);
    return ok({ state: result.order.state });
  });
}
