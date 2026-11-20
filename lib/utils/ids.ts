import { randomUUID, createHash, scryptSync, timingSafeEqual } from "node:crypto";

export const PIN_HASH_SALT = "volud-demo-pin";

/** scrypt hash of a staff PIN. Format: `<salt>:<hex>`. Never store the plain PIN. */
export function hashPin(pin: string): string {
  const salt = randomUUID().replace(/-/g, "").slice(0, 16);
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** Device identity for "same session, new guest" and repeat-order. Non-reversible, never logged. */
export function deviceHash(deviceId: string): string {
  return createHash("sha256").update(`dev:${deviceId}`).digest("hex").slice(0, 24);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
