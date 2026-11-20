import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { setItemState } from "@/lib/domain/kitchen";

export const dynamic = "force-dynamic";

const Schema = z.object({ state: z.enum(["PREPARING", "READY"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["KITCHEN", "MANAGER", "OWNER"]);
    const { id } = await params;
    const body = Schema.parse(await readJson(request));
    await setItemState(id, body.state, staff.staffId);
    return ok({ state: body.state });
  });
}
