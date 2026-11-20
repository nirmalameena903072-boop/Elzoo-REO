import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { resolveReview } from "@/lib/domain/reviews";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["MANAGER", "OWNER"]);
    const { id } = await params;
    return ok(await resolveReview(id, staff.staffId));
  });
}
