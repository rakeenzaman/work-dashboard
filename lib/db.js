// Shared Neon connection and HTTP helpers for the Vercel Functions in ./api and the local dev server.
import { neon } from '@neondatabase/serverless';

const MAX_BODY = 64 * 1024;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const bad = (message) => new HttpError(400, message);

// ---------- connection ----------

let sql = null;
const tables = new Map();

/** Swap in another tagged-template SQL client (tests, scripts). */
export function useSql(client) {
  sql = client;
  tables.clear();
}

/**
 * The SQL client, after running `create(sql)` once per cold start for the table `name`
 * (a `CREATE TABLE IF NOT EXISTS`). A failed attempt is retried on the next call.
 */
export async function connect(name, create) {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new HttpError(500, 'DATABASE_URL is not set (locally: run `npx vercel env pull .env.local`)');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  if (!tables.has(name)) {
    tables.set(
      name,
      create(sql).catch((err) => {
        tables.delete(name);
        throw err;
      }),
    );
  }
  await tables.get(name);
  return sql;
}

// ---------- http ----------

export const json = (data, status = 200) => Response.json(data, { status });

export async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw bad('body too large');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw bad('body must be valid JSON');
  }
}

/** Wraps a route handler: validation errors become 4xx JSON, anything else a logged 500. */
export function route(handler) {
  return async (request) => {
    try {
      return await handler(request);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: 'internal error' }, 500);
    }
  };
}
