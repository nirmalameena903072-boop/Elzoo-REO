import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson, clientKey, throttleOrThrow } from "@/lib/http";
import { deviceIdForRequest, resolveDiner } from "@/lib/server/session-init";
import { createWaiterCall } from "@/lib/domain/orders";

export const dynamic = "force-dynamic";

const Schema = z.object({
  tableNumber: z.string().regex(/^T\d{1,2}$/i),
  reason: z.enum(["BILL", "WATER", "PLATE", "CLEAN", "ASSIST", "OTHER"]),
  note: z.string().max(120).nullable().optional(),
});

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const body = Schema.parse(await readJson(request));
    const deviceId = await deviceIdForRequest();
    throttleOrThrow(clientKey(request, "waiter-call"), 20, 60_000, "Bahut zyada calls — thoda ruk ke try karein.");
    const diner = await resolveDiner(body.tableNumber.toUpperCase(), deviceId);
    const { call, reused, secondsLeft } = await createWaiterCall(
      diner.session.id,
      diner.table.id,
      body.reason,
      body.note ?? null,
    );
    return ok({
      id: call.id,
      reused,
      createdAt: call.createdAt,
      slaDueAt: call.slaDueAt,
      message: reused
        ? `Already on the way — ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
        : "Waiter ko bhej diya",
    });
  });
}
