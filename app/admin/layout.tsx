import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login?next=/admin");
  if (session.role !== "OWNER" && session.role !== "MANAGER") redirect("/staff");
  return <>{children}</>;
}
