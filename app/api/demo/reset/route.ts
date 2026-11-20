import { ensureDb, resetDb, dbTarget } from "@/lib/db";
import { handle, ok, clientKey, throttleOrThrow } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    await ensureDb();
    throttleOrThrow(clientKey(request, "reset"), 3, 60_000, "Reset already chal raha hai — ek minute ruk ke try karein.");
    if (dbTarget().kind === "turso" && process.env.ALLOW_DEMO_RESET !== "true") {
      throw new Error("Reset disabled on a shared database.");
    }
    await resetDb();
    return ok({ reset: true, at: Date.now() });
  });
}
