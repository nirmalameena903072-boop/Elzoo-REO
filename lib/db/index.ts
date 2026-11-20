import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { DDL } from "./ddl";

type DB = LibSQLDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __volud: { client: Client; db: DB; ready: Promise<void>; target: string } | undefined;
}

export type DbTarget = { url: string; authToken?: string; kind: "file" | "turso" | "ephemeral" };

/**
 * Where the database lives.
 *
 * - `TURSO_*` set → a real, shared database. This is the only mode where state
 *   survives across serverless invocations.
 * - production without Turso → local file under /tmp. Every lambda instance gets
 *   its own copy, so writes are per-instance and vanish on cold start. Acceptable
 *   for a demo you're willing to reseed, never for real service.
 * - development → ./data/volud.db, the zero-config local file.
 */
export function dbTarget(): DbTarget {
  const turso = process.env.TURSO_DATABASE_URL;
  if (turso) return { url: turso, authToken: process.env.TURSO_AUTH_TOKEN, kind: "turso" };
  if (process.env.NODE_ENV === "production") return { url: "file:/tmp/volud.db", kind: "ephemeral" };
  return { url: "file:./data/volud.db", kind: "file" };
}

/** True when persistence across requests/instances is guaranteed. */
export function isPersistent(): boolean {
  return dbTarget().kind === "turso";
}

export function getClient(): Client {
  if (!globalThis.__volud) {
    const target = dbTarget();
    const client = createClient({ url: target.url, authToken: target.authToken });
    globalThis.__volud = {
      client,
      db: drizzle(client, { schema }),
      ready: Promise.resolve(),
      target: target.kind,
    };
  }
  return globalThis.__volud.client;
}

export function db(): DB {
  getClient();
  return globalThis.__volud!.db;
}

/** Runs DDL once, then seeds if the outlet row is absent. Safe to call from every request path. */
type Ready = Promise<void> & { installed?: boolean };

export function ensureDb(): Promise<void> {
  getClient();
  const g = globalThis.__volud!;
  if (!(g.ready as Ready).installed) {
    g.ready = (async () => {
      for (const statement of DDL) {
        await g.client.execute(statement);
      }
      const existing = await g.client.execute("SELECT COUNT(*) AS n FROM outlets");
      const n = Number(existing.rows[0]?.n ?? 0);
      if (n === 0) {
        const { seedAll } = await import("./seed");
        await seedAll(db());
      }
    })();
    (g.ready as Ready).installed = true;
  }
  return g.ready;
}

export async function resetDb(): Promise<void> {
  const client = getClient();
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  for (const row of tables.rows) {
    await client.execute(`DROP TABLE IF EXISTS "${String(row.name)}"`);
  }
  for (const statement of DDL) await client.execute(statement);
  const { seedAll } = await import("./seed");
  await seedAll(db());
}

export { schema };
