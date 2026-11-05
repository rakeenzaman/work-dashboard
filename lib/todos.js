// To-do storage on Neon Postgres. Shared by the Vercel Functions in ./api and the local dev server.
import { neon } from '@neondatabase/serverless';

const SECTIONS = new Set(['work', 'life']);
const MAX_TEXT = 500;
const MAX_NOTES = 2000;
const MAX_BODY = 64 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const bad = (message) => new HttpError(400, message);

// ---------- connection ----------

let sql = null;
let schema = null;

/** Swap in another tagged-template SQL client (tests, scripts). */
export function useSql(client) {
  sql = client;
  schema = null;
}

/** The SQL client, with the table created on first use (once per cold start). */
export async function database() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new HttpError(500, 'DATABASE_URL is not set (locally: run `npx vercel env pull .env.local`)');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  schema ??= sql`
    CREATE TABLE IF NOT EXISTS todos (
      id uuid PRIMARY KEY,
      text text NOT NULL,
      notes text NOT NULL DEFAULT '',
      section text NOT NULL CHECK (section IN ('work', 'life')),
      done boolean NOT NULL DEFAULT false,
      priority boolean NOT NULL DEFAULT false,
      due text,
      position integer NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `.catch((err) => {
    schema = null;
    throw err;
  });
  await schema;
  return sql;
}

// ---------- shape & validation ----------

const iso = (value) => (value ? new Date(value).toISOString() : null);

/** Database row → the shape the frontend uses. */
function toTodo(row) {
  return {
    id: row.id,
    text: row.text,
    notes: row.notes,
    section: row.section,
    done: row.done,
    priority: row.priority,
    due: row.due,
    order: row.position,
    createdAt: iso(row.created_at),
    completedAt: iso(row.completed_at),
  };
}

function checkId(id) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new HttpError(404, 'todo not found');
}

/** Validates the editable fields present in `body`; unknown fields are ignored. */
function clean(body, { creating }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('body must be a JSON object');
  const fields = {};
  if (creating || 'text' in body) {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > MAX_TEXT) throw bad('text must be 1-500 characters');
    fields.text = text;
  }
  if ('notes' in body) {
    if (body.notes === null) fields.notes = '';
    else if (typeof body.notes === 'string' && body.notes.length <= MAX_NOTES) fields.notes = body.notes;
    else throw bad('notes must be a string up to 2000 characters');
  }
  if ('section' in body) {
    if (!SECTIONS.has(body.section)) throw bad('section must be "work" or "life"');
    fields.section = body.section;
  }
  for (const key of ['done', 'priority']) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') throw bad(`${key} must be a boolean`);
      fields[key] = body[key];
    }
  }
  if ('due' in body) {
    const due = body.due;
    if (due === null || due === '') fields.due = null;
    else if (typeof due === 'string' && DAY.test(due) && !Number.isNaN(Date.parse(due))) fields.due = due;
    else throw bad('due must be a YYYY-MM-DD date or null');
  }
  return fields;
}

// ---------- operations ----------

export async function listTodos() {
  const db = await database();
  const rows = await db`SELECT * FROM todos ORDER BY position, created_at`;
  return rows.map(toTodo);
}

/** New items go to the bottom; urgent ones start at the top. */
export async function createTodo(body) {
  const f = clean(body, { creating: true });
  const db = await database();
  const priority = f.priority ?? false;
  const done = f.done ?? false;
  const [row] = await db`
    INSERT INTO todos (id, text, notes, section, done, priority, due, position, completed_at)
    VALUES (
      ${crypto.randomUUID()}, ${f.text}, ${f.notes ?? ''}, ${f.section ?? 'work'}, ${done}, ${priority}, ${f.due ?? null},
      (SELECT CASE WHEN ${priority}::boolean THEN COALESCE(MIN(position), 0) - 1 ELSE COALESCE(MAX(position), 0) + 1 END FROM todos),
      CASE WHEN ${done}::boolean THEN now() END
    )
    RETURNING *
  `;
  return toTodo(row);
}

/** Marking urgent bumps an item to the top once; moving lists puts it at the bottom of the new one. */
export async function updateTodo(id, body) {
  checkId(id);
  const f = clean(body, { creating: false });
  const db = await database();
  const [current] = await db`SELECT * FROM todos WHERE id = ${id}`;
  if (!current) throw new HttpError(404, 'todo not found');

  const pick = (key, column = key) => (key in f ? f[key] : current[column]);
  const done = pick('done');
  const completedAt = !done ? null : current.done ? current.completed_at : new Date();
  const toTop = f.priority === true && !current.priority;
  const toBottom = !toTop && 'section' in f && f.section !== current.section;

  const [row] = await db`
    UPDATE todos SET
      text = ${pick('text')},
      notes = ${pick('notes')},
      section = ${pick('section')},
      done = ${done},
      priority = ${pick('priority')},
      due = ${pick('due')},
      completed_at = ${completedAt},
      position = CASE
        WHEN ${toTop}::boolean THEN (SELECT COALESCE(MIN(position), 0) - 1 FROM todos)
        WHEN ${toBottom}::boolean THEN (SELECT COALESCE(MAX(position), 0) + 1 FROM todos)
        ELSE position
      END
    WHERE id = ${id}
    RETURNING *
  `;
  return toTodo(row);
}

export async function deleteTodo(id) {
  checkId(id);
  const db = await database();
  const rows = await db`DELETE FROM todos WHERE id = ${id} RETURNING id`;
  if (!rows.length) throw new HttpError(404, 'todo not found');
}

/**
 * Body: { ids: [...] }, the new top-to-bottom order of some items (one list's open items).
 * They swap their existing positions among themselves, so their place relative to every other
 * item (completed ones, the other list) is untouched.
 */
export async function reorderTodos(body) {
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length > 1000 || new Set(ids).size !== ids.length || !ids.every((id) => UUID.test(id))) {
    throw bad('ids must be an array of unique todo ids');
  }
  const db = await database();
  const rows = await db`SELECT id, position FROM todos WHERE id = ANY(${ids}::uuid[])`;
  if (rows.length !== ids.length) throw bad('unknown todo id');
  const slots = rows.map((r) => r.position).sort((a, b) => a - b);
  const updated = await db`
    UPDATE todos AS t SET position = v.position
    FROM unnest(${ids}::uuid[], ${slots}::integer[]) AS v(id, position)
    WHERE t.id = v.id
    RETURNING t.*
  `;
  return updated.map(toTodo);
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
