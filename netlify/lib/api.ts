// The run API behind the two Netlify Functions (brief, section 5). Pure handlers over a Blobs-like store.
import { nanoid } from 'nanoid';
import { zRun, MAX_RUN_BYTES } from '../../src/lib/schema.ts';

/** The part of a Netlify Blobs store that the API uses. */
export interface BlobStore {
  get(key: string, opts: { type: 'json' }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

interface Stored { run: unknown; editTokenHash: string; createdAt: string; updatedAt: string }

const ID_RE = /^[A-Za-z0-9_-]{21}$/;

export function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Read and validate `{ run }`; a Response on failure. */
async function readRun(req: Request): Promise<{ run: unknown } | Response> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_RUN_BYTES) return json(413, { error: 'The run is larger than 512 KB.' });
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_RUN_BYTES) return json(413, { error: 'The run is larger than 512 KB.' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { error: 'The body is not JSON.' });
  }
  const parsed = zRun.safeParse((body as { run?: unknown } | null)?.run);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return json(400, { error: `The run is not valid: ${issue.path.join('.') || 'run'}: ${issue.message}` });
  }
  return { run: parsed.data };
}

/** POST /api/runs */
export async function handleRuns(req: Request, store: BlobStore): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const r = await readRun(req);
  if (r instanceof Response) return r;
  const id = nanoid(21);
  const editToken = nanoid(32);
  const now = new Date().toISOString();
  const run = { ...(r.run as object), updatedAt: now };
  const stored: Stored = { run, editTokenHash: await sha256Hex(editToken), createdAt: now, updatedAt: now };
  await store.setJSON(id, stored);
  return json(201, { id, editToken });
}

async function authorised(req: Request, stored: Stored): Promise<boolean> {
  const token = req.headers.get('x-edit-token') ?? '';
  return token !== '' && sameHex(await sha256Hex(token), stored.editTokenHash);
}

/** GET, PUT, DELETE /api/runs/:id */
export async function handleRun(req: Request, store: BlobStore, id: string | undefined): Promise<Response> {
  if (!id || !ID_RE.test(id)) return json(404, { error: 'Run not found.' });
  const stored = (await store.get(id, { type: 'json' })) as Stored | null;
  if (!stored) return json(404, { error: 'Run not found.' });

  if (req.method === 'GET') return json(200, { run: stored.run, createdAt: stored.createdAt, updatedAt: stored.updatedAt });

  if (req.method === 'PUT') {
    if (!(await authorised(req, stored))) return json(403, { error: 'The edit key does not match.' });
    const r = await readRun(req);
    if (r instanceof Response) return r;
    const now = new Date().toISOString();
    await store.setJSON(id, { ...stored, run: { ...(r.run as object), updatedAt: now }, updatedAt: now });
    return json(200, { updatedAt: now });
  }

  if (req.method === 'DELETE') {
    if (!(await authorised(req, stored))) return json(403, { error: 'The edit key does not match.' });
    await store.delete(id);
    return json(204);
  }

  return json(405, { error: 'Method not allowed.' });
}
