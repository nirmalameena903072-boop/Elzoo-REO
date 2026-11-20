import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { floorPayload } from "@/lib/server/floor";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["WAITER", "MANAGER", "OWNER"]);
    return ok(await floorPayload(staff));
  });
}
