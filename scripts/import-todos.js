// One-time import of the old local server's data/todos.json into Neon. Safe to re-run:
// items that already exist (same id) are skipped.
// Usage: node --env-file=.env.local scripts/import-todos.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { database } from '../lib/todos.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'todos.json');
const todos = JSON.parse(await fs.readFile(file, 'utf8'));
const db = await database();

let imported = 0;
for (const [i, t] of todos.entries()) {
  const rows = await db`
    INSERT INTO todos (id, text, notes, section, done, priority, due, position, created_at, completed_at)
    VALUES (
      ${t.id}, ${t.text}, ${t.notes ?? ''}, ${t.section}, ${t.done}, ${t.priority}, ${t.due ?? null},
      ${typeof t.order === 'number' ? t.order : i}, ${t.createdAt}, ${t.completedAt ?? null}
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  imported += rows.length;
}
console.log(`Imported ${imported} of ${todos.length} to-dos (${todos.length - imported} already there).`);
