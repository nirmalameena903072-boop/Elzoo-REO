import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { replyToReview } from "@/lib/domain/reviews";

export const dynamic = "force-dynamic";

const Schema = z.object({ reply: z.string().min(2).max(400) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staff = await requireStaff(["MANAGER", "OWNER"]);
    const { id } = await params;
    const body = Schema.parse(await readJson(request));
    return ok(await replyToReview(id, body.reply, staff.staffId));
  });
}
