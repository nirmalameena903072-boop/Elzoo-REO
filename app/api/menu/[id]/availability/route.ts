import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { setAvailability } from "@/lib/domain/kitchen";

export const dynamic = "force-dynamic";

const Schema = z.object({ available: z.boolean(), reason: z.string().max(60).nullable().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["KITCHEN", "MANAGER", "OWNER"]);
    const { id } = await params;
    const body = Schema.parse(await readJson(request));
    const result = await setAvailability(id, body.available, staff.staffId, body.reason ?? null);
    return ok({ available: result.item.available });
  });
}
