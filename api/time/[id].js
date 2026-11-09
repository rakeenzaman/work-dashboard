// PATCH /api/time/:id, DELETE /api/time/:id
import { json, readBody, route } from '../../lib/db.js';
import { deleteTime, updateTime } from '../../lib/time.js';

const idOf = (request) => decodeURIComponent(new URL(request.url).pathname.split('/').pop());

export const PATCH = route(async (request) => json(await updateTime(idOf(request), await readBody(request))));

export const DELETE = route(async (request) => {
  await deleteTime(idOf(request));
  return new Response(null, { status: 204 });
});
