import { describe, it, expect } from 'vitest';
import { encodeRuns, decodeRuns, capRuns, readCookie, cookieHeader, COOKIE_MAX, type RunRef } from '../src/lib/cookie';

const ref = (i: number): RunRef => ({
  id: `id${String(i).padStart(19, '0')}`, token: 't'.repeat(32), title: `Run ${i} with “quotes” and ü`, updatedAt: `2026-10-${String(1 + (i % 28)).padStart(2, '0')}T00:00:${String(i % 60).padStart(2, '0')}Z`,
});

describe('cookie', () => {
  it('encodes and decodes', () => {
    const list = [ref(1), ref(2)];
    const v = encodeRuns(list);
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeRuns(v)).toEqual(list);
    expect(readCookie(`a=b; tte_runs=${v}; c=d`)).toEqual(list);
  });

  it('tolerates garbage', () => {
    expect(decodeRuns('%%%')).toEqual([]);
    expect(decodeRuns(encodeRuns([{ x: 1 } as unknown as RunRef]))).toEqual([]);
    expect(readCookie('')).toEqual([]);
  });

  it('drops the oldest entries when the cookie would exceed 3,800 bytes', () => {
    const list = Array.from({ length: 60 }, (_, i) => ref(i));
    const { list: kept, dropped } = capRuns(list);
    expect(dropped.length).toBeGreaterThan(0);
    expect(encodeRuns(kept).length).toBeLessThanOrEqual(COOKIE_MAX);
    const oldestKept = kept.map((r) => r.updatedAt).sort()[0];
    for (const d of dropped) expect(d.updatedAt <= oldestKept).toBe(true);
    expect(capRuns(list.slice(0, 3)).dropped).toEqual([]);
  });

  it('writes the attributes of the brief', () => {
    expect(cookieHeader('v', true)).toBe('tte_runs=v; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
    expect(cookieHeader('v', false)).toBe('tte_runs=v; Path=/; Max-Age=31536000; SameSite=Lax');
  });
});
