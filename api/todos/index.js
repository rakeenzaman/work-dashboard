// GET /api/todos, POST /api/todos
import { createTodo, json, listTodos, readBody, route } from '../../lib/todos.js';

export const GET = route(async () => json(await listTodos()));

export const POST = route(async (request) => json(await createTodo(await readBody(request)), 201));
