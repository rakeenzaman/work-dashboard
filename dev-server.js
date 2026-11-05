// Local stand-in for Vercel: runs the functions in ./api so Vite can proxy /api to them.
// Reads DATABASE_URL from .env.local (create it with `npx vercel env pull .env.local`).
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.API_PORT) || 4321;

try {
  process.loadEnvFile(path.join(__dirname, '.env.local'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

// Mirrors Vercel's file-based routing for this app's routes (static segments win over [id]).
const ROUTES = [
  [/^\/api\/todos\/?$/, 'api/todos/index.js'],
  [/^\/api\/todos\/reorder\/?$/, 'api/todos/reorder.js'],
  [/^\/api\/todos\/[^/]+\/?$/, 'api/todos/[id].js'],
];

function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const match = ROUTES.find(([pattern]) => pattern.test(url.pathname));
      if (!match) return send(res, 404, { error: 'not found' });
      const handler = (await import(pathToFileURL(path.join(__dirname, match[1])).href))[req.method];
      if (!handler) return send(res, 405, { error: 'method not allowed' });

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        for (const v of [value].flat()) if (v !== undefined) headers.append(key, v);
      }
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const response = await handler(new Request(url, { method: req.method, headers, body: hasBody ? await readRaw(req) : undefined }));

      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error(err);
      send(res, 500, { error: 'internal error' });
    }
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`API running at http://localhost:${PORT}`);
    if (!process.env.DATABASE_URL) console.log('DATABASE_URL not set: run `npx vercel env pull .env.local`');
  });
