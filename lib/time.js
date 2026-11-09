// Time tracking on Neon Postgres: what you worked on each weekday, and for how long.
import { bad, connect, HttpError } from './db.js';

const MAX_LABEL = 200;
const MAX_RANGE_DAYS = 62;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The SQL client, with the time_entries table created on first use (once per cold start). */
const database = () =>
  connect(
    'time_entries',
    (sql) => sql`
      CREATE TABLE IF NOT EXISTS time_entries (
        id uuid PRIMARY KEY,
        day text NOT NULL,
        label text NOT NULL,
        hours numeric(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `,
  );

/** Database row → the shape the frontend uses (numeric arrives as a string). */
function toEntry(row) {
  return {
    id: row.id,
    day: row.day,
    label: row.label,
    hours: Number(row.hours),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** A real calendar day as `YYYY-MM-DD` (rejects things like 2026-02-31). */
function isDay(value) {
  if (typeof value !== 'string' || !DAY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function checkId(id) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new HttpError(404, 'entry not found');
}

/** Validates the editable fields present in `body`; unknown fields are ignored. */
function clean(body, { creating }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('body must be a JSON object');
  const fields = {};
  if (creating || 'day' in body) {
    if (!isDay(body.day)) throw bad('day must be a YYYY-MM-DD date');
    fields.day = body.day;
  }
  if (creating || 'label' in body) {
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label || label.length > MAX_LABEL) throw bad(`label must be 1-${MAX_LABEL} characters`);
    fields.label = label;
  }
  if (creating || 'hours' in body) {
    const hours = typeof body.hours === 'number' ? Math.round(body.hours * 100) / 100 : NaN;
    if (!(hours > 0 && hours <= 24)) throw bad('hours must be a number above 0 and at most 24');
    fields.hours = hours;
  }
  return fields;
}

/** Entries from `from` to `to`, inclusive (both `YYYY-MM-DD`). */
export async function listTime(from, to) {
  if (!isDay(from) || !isDay(to) || from > to) throw bad('from and to must be YYYY-MM-DD dates, from <= to');
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > MAX_RANGE_DAYS) throw bad(`range is limited to ${MAX_RANGE_DAYS} days`);
  const db = await database();
  const rows = await db`
    SELECT * FROM time_entries WHERE day BETWEEN ${from} AND ${to} ORDER BY day, created_at
  `;
  return rows.map(toEntry);
}

export async function createTime(body) {
  const f = clean(body, { creating: true });
  const db = await database();
  const [row] = await db`
    INSERT INTO time_entries (id, day, label, hours)
    VALUES (${crypto.randomUUID()}, ${f.day}, ${f.label}, ${f.hours})
    RETURNING *
  `;
  return toEntry(row);
}

export async function updateTime(id, body) {
  checkId(id);
  const f = clean(body, { creating: false });
  const db = await database();
  const [row] = await db`
    UPDATE time_entries SET
      day = COALESCE(${f.day ?? null}, day),
      label = COALESCE(${f.label ?? null}, label),
      hours = COALESCE(${f.hours ?? null}::numeric, hours)
    WHERE id = ${id}
    RETURNING *
  `;
  if (!row) throw new HttpError(404, 'entry not found');
  return toEntry(row);
}

export async function deleteTime(id) {
  checkId(id);
  const db = await database();
  const rows = await db`DELETE FROM time_entries WHERE id = ${id} RETURNING id`;
  if (!rows.length) throw new HttpError(404, 'entry not found');
}
