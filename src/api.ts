import type { TimeEntry, TimeInput, TimePatch, Todo, TodoInput, TodoPatch } from './types';

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

export const timeApi = {
  list: (from: string, to: string) => request<TimeEntry[]>(`/api/time?from=${from}&to=${to}`),
  create: (input: TimeInput) => request<TimeEntry>('/api/time', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, patch: TimePatch) =>
    request<TimeEntry>(`/api/time/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/api/time/${id}`, { method: 'DELETE' }),
};
