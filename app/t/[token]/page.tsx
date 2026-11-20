import { redirect } from "next/navigation";
import { readTableToken } from "@/lib/auth/table-token";
import { ensureDb } from "@/lib/db";
import { getTableById } from "@/lib/db/queries";
import { ExpiredTokenScreen } from "@/components/diner/ExpiredTokenScreen";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export default async function DinerEntry({ params }: Params) {
  const { token } = await params;
  await ensureDb();

  // A raw table number like /t/T5 is the friendly demo link; a signed token is the production path.
  if (/^T\d{1,2}$/i.test(token)) {
    redirect(`/t/${token.toUpperCase()}/menu`);
  }

  const result = readTableToken(token);
  if (!result.ok) return <ExpiredTokenScreen reason={result.reason} />;

  const table = await getTableById(result.payload.tableId);
  if (!table) return <ExpiredTokenScreen reason="malformed" />;
  redirect(`/t/${table.number}/menu`);
}
