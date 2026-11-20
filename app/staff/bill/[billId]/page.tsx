import { redirect } from "next/navigation";
import { ensureDb } from "@/lib/db";
import { getStaffSession } from "@/lib/auth/session";
import { billDeskPayload } from "@/lib/server/billing";
import { BillDesk } from "@/components/staff/BillDesk";

export const dynamic = "force-dynamic";

export default async function BillPage({ params }: { params: Promise<{ billId: string }> }) {
  await ensureDb();
  const staff = await getStaffSession();
  if (!staff) redirect("/staff/login");
  if (staff.role === "KITCHEN") redirect("/kitchen");
  const { billId } = await params;
  const desk = await billDeskPayload(billId);
  return <BillDesk initial={desk} canDiscount={staff.role === "MANAGER" || staff.role === "OWNER"} />;
}
