import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { createSplits } from "@/lib/domain/billing";

export const dynamic = "force-dynamic";

const Schema = z.object({
  mode: z.enum(["EQUAL", "BY_ITEM", "CUSTOM"]),
  ways: z.number().int().min(2).max(8).optional(),
  items: z.array(z.string()).optional(),
  custom: z.array(z.number().int()).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const { id } = await params;
    const body = Schema.parse(await readJson(request));
    const result = await createSplits(id, body.mode, { ways: body.ways, items: body.items, custom: body.custom });
    return ok(result);
  });
}
