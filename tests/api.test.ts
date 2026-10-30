import { describe, it, expect, vi, beforeEach } from 'vitest';
import { example } from './helpers';

const mem = new Map<string, string>();
const memStore = {
  get: vi.fn(async (k: string) => (mem.has(k) ? JSON.parse(mem.get(k)!) : null)),
  setJSON: vi.fn(async (k: string, v: unknown) => { mem.set(k, JSON.stringify(v)); }),
  delete: vi.fn(async (k: string) => { mem.delete(k); }),
};
const getStore = vi.fn(() => memStore);
vi.mock('@netlify/blobs', () => ({ getStore }));

const { default: runs, config: runsConfig } = await import('../netlify/functions/runs.mts');
const { default: one, config: oneConfig } = await import('../netlify/functions/run.mts');

const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request('https://x.test/api/runs', { method, body: body === undefined ? undefined : JSON.stringify(body), headers });
const at = (id: string) => ({ params: { id } });

describe('run API', () => {
  beforeEach(() => mem.clear());

  it('has the paths of the brief and a strong store', async () => {
    expect(runsConfig.path).toBe('/api/runs');
    expect(oneConfig.path).toBe('/api/runs/:id');
    await runs(req('POST', { run: example() }));
    expect(getStore).toHaveBeenCalledWith({ name: 'tte-runs', consistency: 'strong' });
  });

  it('creates, reads, updates and deletes', async () => {
    const created = await runs(req('POST', { run: example() }));
    expect(created.status).toBe(201);
    expect(created.headers.get('cache-control')).toBe('no-store');
    const { id, editToken } = await created.json();
    expect(id).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(editToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const stored = JSON.parse(mem.get(id)!);
    expect(stored.editTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(editToken);

    const got = await one(req('GET'), at(id));
    expect(got.status).toBe(200);
    const g = await got.json();
    expect(g.run.title).toBe(example().title);
    expect(g.createdAt).toBeTruthy();

    const changed = { ...example(), title: 'Changed' };
    const put = await one(req('PUT', { run: changed }, { 'X-Edit-Token': editToken }), at(id));
    expect(put.status).toBe(200);
    expect((await put.json()).updatedAt).toBeTruthy();
    expect((await (await one(req('GET'), at(id))).json()).run.title).toBe('Changed');

    const del = await one(req('DELETE', undefined, { 'X-Edit-Token': editToken }), at(id));
    expect(del.status).toBe(204);
    expect((await one(req('GET'), at(id))).status).toBe(404);
  });

  it('refuses a wrong or missing token', async () => {
    const { id } = await (await runs(req('POST', { run: example() }))).json();
    expect((await one(req('PUT', { run: example() }, { 'X-Edit-Token': 'x'.repeat(32) }), at(id))).status).toBe(403);
    expect((await one(req('PUT', { run: example() }), at(id))).status).toBe(403);
    expect((await one(req('DELETE', undefined, { 'X-Edit-Token': 'nope' }), at(id))).status).toBe(403);
    expect((await one(req('GET'), at(id))).status).toBe(200);
  });

  it('validates the run and limits its size', async () => {
    const bad = await runs(req('POST', { run: { title: 'x' } }));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/not valid/);
    const big = { ...example(), notes: ['x'.repeat(600 * 1024)] };
    expect((await runs(req('POST', { run: big }))).status).toBe(413);
    expect((await runs(req('GET'))).status).toBe(405);
  });

  it('returns 404 for an unknown or malformed id', async () => {
    expect((await one(req('GET'), at('a'.repeat(21)))).status).toBe(404);
    expect((await one(req('GET'), at('../etc'))).status).toBe(404);
  });
});
