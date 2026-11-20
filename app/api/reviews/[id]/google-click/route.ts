import { ensureDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { markGoogleClicked } from "@/lib/domain/reviews";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await ensureDb();
    const { id } = await params;
    return ok(await markGoogleClicked(id));
  });
}
