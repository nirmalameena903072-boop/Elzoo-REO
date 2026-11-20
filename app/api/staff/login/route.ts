import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { ok, fail, handle, readJson, clientKey, throttleOrThrow } from "@/lib/http";
import { findStaffByPin } from "@/lib/auth/pin";
import { createStaffSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const Schema = z.object({ pin: z.string().regex(/^\d{4}$/, "4 digit PIN daalein") });

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const ip = clientKey(request, "pin");
    throttleOrThrow(ip, 10, 60_000, "Bahut attempts — ek minute baad try karein.");
    const body = Schema.parse(await readJson(request));
    const staff = await findStaffByPin(body.pin);
    if (!staff) return fail("FORBIDDEN", "PIN galat hai. Demo PINs /demo pe likhe hain.", 401);
    await createStaffSession({
      staffId: staff.id,
      name: staff.name,
      role: staff.role,
      section: staff.section,
      outletId: staff.outletId,
    });
    const redirect = staff.role === "KITCHEN" ? "/kitchen" : staff.role === "OWNER" ? "/admin" : "/staff";
    return ok({ redirect, name: staff.name, role: staff.role });
  });
}
