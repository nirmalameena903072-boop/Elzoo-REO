import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { deviceIdForRequest, resolveDiner } from "@/lib/server/session-init";
import { findRecentDuplicates } from "@/lib/domain/orders";

export const dynamic = "force-dynamic";

const Schema = z.object({
  lines: z.array(z.object({ menuItemId: z.string(), notes: z.string().nullable().optional() })).max(30),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handle(async () => {
    await ensureDb();
    const { token } = await params;
    const body = Schema.parse(await readJson(request));
    const deviceId = await deviceIdForRequest();
    const diner = await resolveDiner(token.toUpperCase(), deviceId);
    const duplicates = await findRecentDuplicates(
      diner.session.id,
      body.lines.map((l) => ({ menuItemId: l.menuItemId, qty: 1, notes: l.notes ?? null })),
    );
    return ok({ duplicates });
  });
}
