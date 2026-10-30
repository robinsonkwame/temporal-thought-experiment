// The "My runs" cookie (brief, section 5.3): the list of the researcher's runs and their edit tokens.
export interface RunRef { id: string; token: string; title: string; updatedAt: string }

export const COOKIE_NAME = 'tte_runs';
export const COOKIE_MAX = 3800;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeRuns(list: RunRef[]): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(list)));
}

export function decodeRuns(value: string | undefined): RunRef[] {
  if (!value) return [];
  try {
    const list = JSON.parse(new TextDecoder().decode(fromBase64Url(value)));
    if (!Array.isArray(list)) return [];
    return list.filter((x): x is RunRef =>
      x && typeof x.id === 'string' && typeof x.token === 'string' && typeof x.title === 'string' && typeof x.updatedAt === 'string');
  } catch {
    return [];
  }
}

/** Drop the entries with the oldest updatedAt until the encoded list fits. */
export function capRuns(list: RunRef[], max = COOKIE_MAX): { list: RunRef[]; dropped: RunRef[] } {
  const sorted = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const dropped: RunRef[] = [];
  while (sorted.length && encodeRuns(sorted).length > max) dropped.push(sorted.pop()!);
  return { list: sorted, dropped };
}

export function cookieHeader(value: string, secure: boolean): string {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function readCookie(cookieString: string): RunRef[] {
  const part = cookieString.split(/;\s*/).find((p) => p.startsWith(`${COOKIE_NAME}=`));
  return decodeRuns(part?.slice(COOKIE_NAME.length + 1));
}

// Browser helpers.
let onFull: (() => void) | null = null;
export function onCookieFull(fn: (() => void) | null) { onFull = fn; }

export function myRuns(): RunRef[] {
  return typeof document === 'undefined' ? [] : readCookie(document.cookie);
}

function save(list: RunRef[]) {
  const { list: kept, dropped } = capRuns(list);
  document.cookie = cookieHeader(encodeRuns(kept), location.protocol === 'https:');
  if (dropped.length && onFull) onFull();
}

export function rememberRun(ref: RunRef) {
  save([ref, ...myRuns().filter((r) => r.id !== ref.id)]);
}

export function touchRun(id: string, title: string, updatedAt: string) {
  const list = myRuns();
  const r = list.find((x) => x.id === id);
  if (!r || (r.title === title && r.updatedAt === updatedAt)) return;
  save(list.map((x) => (x.id === id ? { ...x, title, updatedAt } : x)));
}

export function forgetRun(id: string) {
  save(myRuns().filter((r) => r.id !== id));
}

export function tokenFor(id: string): string | undefined {
  return myRuns().find((r) => r.id === id)?.token;
}
