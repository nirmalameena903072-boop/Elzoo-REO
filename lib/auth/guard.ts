import type { Role } from "@/lib/db/schema";
import { DomainError } from "@/lib/domain/errors";
import { getStaffSession, type StaffSession } from "./session";

const ORDER: Record<Role, number> = { WAITER: 1, KITCHEN: 1, MANAGER: 2, OWNER: 3 };

export const can = {
  acceptOrders: (r: Role) => r === "WAITER" || r === "MANAGER" || r === "OWNER",
  serve: (r: Role) => r === "WAITER" || r === "MANAGER" || r === "OWNER",
  bill: (r: Role) => r === "MANAGER" || r === "OWNER",
  discount: (r: Role) => r === "MANAGER" || r === "OWNER",
  cash: (r: Role) => r === "MANAGER" || r === "OWNER",
  menu: (r: Role) => r === "OWNER",
  analytics: (r: Role) => r === "OWNER",
  staff: (r: Role) => r === "OWNER",
  reviews: (r: Role) => r === "MANAGER" || r === "OWNER",
  kitchen: (r: Role) => r === "KITCHEN" || r === "MANAGER" || r === "OWNER",
};

export async function requireStaff(roles?: Role[]): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) {
    throw new DomainError("FORBIDDEN", "Pehle PIN se login karein.", 401);
  }
  if (roles && !roles.includes(session.role)) {
    throw new DomainError(
      "FORBIDDEN",
      `Yeh kaam ${roles.join(" / ")} role ka hai. Aap ${session.role} se logged in hain.`,
      403,
    );
  }
  return session;
}

export async function requireAtLeast(role: Role): Promise<StaffSession> {
  const session = await requireStaff();
  if (ORDER[session.role] < ORDER[role]) {
    throw new DomainError("FORBIDDEN", `Iske liye ${role} access chahiye.`, 403);
  }
  return session;
}

/**
 * Section scoping: a waiter may only act on their own section. Manager and owner span the floor.
 */
export function assertSection(session: StaffSession, section: string): void {
  if (session.role === "MANAGER" || session.role === "OWNER") return;
  if (session.section && session.section !== section) {
    throw new DomainError(
      "FORBIDDEN",
      `Table section ${section} mein hai, aap section ${session.section} pe ho. Manager se keh dein.`,
      403,
    );
  }
}
