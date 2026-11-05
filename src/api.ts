import type { Todo, TodoInput, TodoPatch } from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  list: () => request<Todo[]>('/api/todos'),
  create: (input: TodoInput) => request<Todo>('/api/todos', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, patch: TodoPatch) =>
    request<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/api/todos/${id}`, { method: 'DELETE' }),
  reorder: (ids: string[]) => request<Todo[]>('/api/todos/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
};
