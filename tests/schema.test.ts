import { describe, it, expect } from 'vitest';
import exampleJson from '../src/content/example_utaut2.json';
import { zRun } from '../src/lib/schema';
import { SLOTS_24, SLOTS_25 } from '../src/lib/types';

describe('schema', () => {
  it('accepts the example run', () => {
    const r = zRun.safeParse(exampleJson);
    expect(r.success ? '' : JSON.stringify(r.error.issues.slice(0, 3))).toBe('');
  });
  it('rejects a run without a theory', () => {
    const bad: Record<string, unknown> = structuredClone(exampleJson);
    delete bad.theory;
    expect(zRun.safeParse(bad).success).toBe(false);
  });
  it('has 34 slots in each version', () => {
    expect(SLOTS_24.length).toBe(34);
    expect(SLOTS_25.length).toBe(34);
    expect(SLOTS_25).not.toContain('DIMENSION_GUARD');
    expect(SLOTS_25[SLOTS_25.indexOf('H2_DESCRIPTION') + 1]).toBe('STYLE_MODEL');
  });
});
