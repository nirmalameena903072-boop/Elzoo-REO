import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/db/schema";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-fallback-session-secret-change-me");
const COOKIE = "volud_staff";
const GUEST_COOKIE = "volud_guest";
const TWELVE_HOURS = 12 * 60 * 60;

export type StaffSession = {
  staffId: string;
  name: string;
  role: Role;
  section: string | null;
  outletId: string;
};

export async function createStaffSession(session: StaffSession): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TWELVE_HOURS}s`)
    .sign(SECRET);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TWELVE_HOURS,
  });
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const session = payload as unknown as StaffSession;
    if (!session?.staffId || !session?.role) return null;
    return session;
  } catch {
    return null;
  }
}

export async function clearStaffSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Anonymous device id for the diner. Set once, read everywhere. Never used for auth. */
export async function getOrCreateDeviceId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  jar.set(GUEST_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return fresh;
}

export async function readDeviceId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(GUEST_COOKIE)?.value ?? null;
}
