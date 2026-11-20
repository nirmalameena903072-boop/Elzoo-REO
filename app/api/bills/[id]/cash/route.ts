import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { requireStaff } from "@/lib/auth/guard";
import { collectCash } from "@/lib/domain/billing";

export const dynamic = "force-dynamic";

const Schema = z.object({}).optional();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const staffSession = await requireStaff(["MANAGER", "OWNER"]);
    const { id } = await params;
    await readJson(request).catch(() => Schema.parse({}));
    const result = await collectCash(id, staffSession.staffId);
    return ok(result);
  });
}
