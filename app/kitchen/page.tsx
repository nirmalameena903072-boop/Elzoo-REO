import { redirect } from "next/navigation";
import { ensureDb } from "@/lib/db";
import { getStaffSession } from "@/lib/auth/session";
import { kitchenBoard } from "@/lib/server/kitchen";
import { KitchenDisplay } from "@/components/kitchen/KitchenDisplay";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  await ensureDb();
  const staff = await getStaffSession();
  if (!staff || !["KITCHEN", "MANAGER", "OWNER"].includes(staff.role)) redirect("/staff/login?next=/kitchen");
  const board = await kitchenBoard();
  return <KitchenDisplay initial={board} kitchenName={staff.name} />;
}
