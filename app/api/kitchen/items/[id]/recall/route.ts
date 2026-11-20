import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { recallItem } from "@/lib/domain/kitchen";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    await requireStaff(["KITCHEN", "MANAGER", "OWNER"]);
    const { id } = await params;
    await recallItem(id);
    return ok({ recalled: true });
  });
}
