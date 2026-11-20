import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { setTip } from "@/lib/domain/billing";

export const dynamic = "force-dynamic";

const Schema = z.object({ tipPaise: z.number().int().min(0).max(200_000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const { id } = await params;
    const body = Schema.parse(await readJson(request));
    return ok(await setTip(id, body.tipPaise));
  });
}
