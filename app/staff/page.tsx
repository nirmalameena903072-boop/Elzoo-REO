import { redirect } from "next/navigation";
import { ensureDb } from "@/lib/db";
import { getStaffSession } from "@/lib/auth/session";
import { floorPayload, managerAlertText } from "@/lib/server/floor";
import { FloorBoard } from "@/components/staff/FloorBoard";

export const dynamic = "force-dynamic";

export default async function StaffFloor() {
  await ensureDb();
  const staff = await getStaffSession();
  if (!staff || (staff.role !== "WAITER" && staff.role !== "MANAGER" && staff.role !== "OWNER")) {
    redirect("/staff/login?next=/staff");
  }
  const [floor, alert] = await Promise.all([floorPayload(staff), staff.role === "MANAGER" || staff.role === "OWNER" ? managerAlertText() : Promise.resolve(null)]);

  return <FloorBoard staff={{ id: staff.staffId, name: staff.name, role: staff.role, section: staff.section }} initialFloor={floor} bannerAlert={alert} />;
}
