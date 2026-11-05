// PATCH /api/todos/:id, DELETE /api/todos/:id
import { deleteTodo, json, readBody, route, updateTodo } from '../../lib/todos.js';

const idOf = (request) => decodeURIComponent(new URL(request.url).pathname.split('/').pop());

export const PATCH = route(async (request) => json(await updateTodo(idOf(request), await readBody(request))));

export const DELETE = route(async (request) => {
  await deleteTodo(idOf(request));
  return new Response(null, { status: 204 });
});
