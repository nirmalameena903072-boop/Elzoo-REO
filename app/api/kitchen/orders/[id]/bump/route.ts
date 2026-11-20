import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { bumpOrderStation } from "@/lib/domain/kitchen";

export const dynamic = "force-dynamic";

const Schema = z.object({ station: z.enum(["TANDOOR", "CURRY", "CHINESE", "BAR", "DESSERT"]).nullable().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["KITCHEN", "MANAGER", "OWNER"]);
    const { id } = await params;
    const body = Schema.parse(await readJson(request).catch(() => ({})));
    const result = await bumpOrderStation(id, body.station ?? null, staff.staffId);
    return ok(result);
  });
}
