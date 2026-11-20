import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { deviceIdForRequest, resolveDiner } from "@/lib/server/session-init";
import { generateBillForSession } from "@/lib/domain/billing";
import { DomainError } from "@/lib/domain/errors";

export const dynamic = "force-dynamic";

const Schema = z.object({ tableNumber: z.string().regex(/^T\d{1,2}$/i) });

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const body = Schema.parse(await readJson(request));
    const deviceId = await deviceIdForRequest();
    const diner = await resolveDiner(body.tableNumber.toUpperCase(), deviceId);

    if (diner.session.state === "PAID" || diner.session.state === "CLOSED") {
      throw new DomainError("CONFLICT", "Yeh table already paid hai. Naya order karne ke liye waiter se naya session khulwayein.", 409);
    }
    const { bill } = await generateBillForSession(diner.session.id, null);
    return ok({ billId: bill.id, totalPaise: bill.totalPaise, number: bill.number });
  });
}
