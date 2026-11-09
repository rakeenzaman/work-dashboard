// GET /api/time?from=YYYY-MM-DD&to=YYYY-MM-DD, POST /api/time
import { json, readBody, route } from '../../lib/db.js';
import { createTime, listTime } from '../../lib/time.js';

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  return json(await listTime(params.get('from'), params.get('to')));
});

export const POST = route(async (request) => json(await createTime(await readBody(request)), 201));
