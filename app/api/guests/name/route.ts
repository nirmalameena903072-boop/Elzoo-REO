import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { handle, ok, readJson } from "@/lib/http";
import { setGuestName } from "@/lib/server/session-init";

export const dynamic = "force-dynamic";

const Schema = z.object({ guestId: z.string().min(4), name: z.string().min(1).max(24) });

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    const body = Schema.parse(await readJson(request));
    await setGuestName(body.guestId, body.name);
    return ok({ saved: true });
  });
}
