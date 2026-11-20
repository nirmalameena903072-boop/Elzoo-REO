import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { kitchenBoard } from "@/lib/server/kitchen";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await ensureDb();
    await requireStaff(["KITCHEN", "MANAGER", "OWNER"]);
    return ok(await kitchenBoard());
  });
}
