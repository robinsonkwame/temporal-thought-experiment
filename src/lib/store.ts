// Client for the run API (brief, section 5.2).
import type { Run } from './types';
import { zRun } from './schema';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export async function createRun(run: Run): Promise<{ id: string; editToken: string }> {
  return call('/api/runs', { method: 'POST', body: JSON.stringify({ run: zRun.parse(run) }) });
}

export async function loadRun(id: string): Promise<{ run: Run; createdAt: string; updatedAt: string }> {
  const r = await call<{ run: unknown; createdAt: string; updatedAt: string }>(`/api/runs/${encodeURIComponent(id)}`);
  return { ...r, run: zRun.parse(r.run) };
}

export async function saveRun(id: string, token: string, run: Run, keepalive = false): Promise<{ updatedAt: string }> {
  return call(`/api/runs/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify({ run: zRun.parse(run) }), headers: { 'X-Edit-Token': token }, keepalive,
  });
}

export async function deleteRun(id: string, token: string): Promise<void> {
  return call(`/api/runs/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Edit-Token': token } });
}

export function shareLink(id: string): string {
  return `${location.origin}/run/${id}`;
}
