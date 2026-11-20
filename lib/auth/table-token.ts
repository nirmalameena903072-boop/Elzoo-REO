import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.TABLE_TOKEN_SECRET ?? "dev-fallback-table-token-secret-change-me";
const TTL = 24 * 60 * 60 * 1000;

export type TablePayload = {
  outletId: string;
  tableId: string;
  tableNumber: string;
  v: number;
  iat: number;
  exp: number;
};

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function sign(payload: string): string {
  return b64url(createHmac("sha256", SECRET).update(payload).digest());
}

export function mintTableToken(input: Omit<TablePayload, "iat" | "exp">): string {
  const iat = Date.now();
  const payload: TablePayload = { ...input, iat, exp: iat + TTL };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export type TokenResult =
  | { ok: true; payload: TablePayload }
  | { ok: false; reason: "malformed" | "signature" | "expired" };

export function readTableToken(token: string | undefined | null): TokenResult {
  if (!token) return { ok: false, reason: "malformed" };
  const [body, signature] = token.split(".");
  if (!body || !signature) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "signature" };
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as TablePayload;
    if (!payload?.exp || payload.exp < Date.now()) return { ok: false, reason: "expired" };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
