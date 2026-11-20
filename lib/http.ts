import { ZodError } from "zod";
import { DomainError } from "@/lib/domain/errors";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; message: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data } satisfies ApiOk<T>);
}

export function fail(error: string, message: string, status: number): Response {
  return Response.json({ ok: false, error, message } satisfies ApiErr, { status });
}

/** Every handler funnels through here so a stack trace never leaves the server. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, error.status);
    if (error instanceof ZodError) {
      return fail("VALIDATION", error.issues[0]?.message ?? "Input theek nahi hai.", 400);
    }
    const message = error instanceof Error ? error.message : "Unknown";
    if (process.env.NODE_ENV !== "production") {
      console.error("[volud]", message);
    }
    return fail("INTERNAL", "Server pe kuch atka hai — ek baar phir try karein.", 500);
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new DomainError("VALIDATION", "Request body JSON nahi hai.", 400);
  }
}

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key");
  if (!key || key.length < 8 || key.length > 120) {
    throw new DomainError("VALIDATION", "Idempotency-Key header chahiye (8–120 chars).", 400);
  }
  return key;
}

/** In-memory sliding window. Fine for a demo; swap for Upstash before real traffic. */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((ts) => now - ts < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "local";
  return `${scope}:${forwarded.split(",")[0]?.trim()}`;
}

export function throttleOrThrow(key: string, limit: number, windowMs: number, message: string): void {
  if (!rateLimit(key, limit, windowMs)) throw new DomainError("RATE_LIMITED", message, 429);
}
