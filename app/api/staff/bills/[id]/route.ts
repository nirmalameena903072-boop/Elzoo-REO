import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { billDeskPayload } from "@/lib/server/billing";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    const { id } = await params;
    return ok(await billDeskPayload(id));
  });
}
