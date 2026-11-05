// POST /api/todos/reorder
import { json, readBody, reorderTodos, route } from '../../lib/todos.js';

export const POST = route(async (request) => json(await reorderTodos(await readBody(request))));
