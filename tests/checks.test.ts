import { describe, it, expect } from 'vitest';
import { example } from './helpers';
import { tableCheck, stepState, stepFindings } from '../src/lib/checks';
import { copyExample, newRun } from '../src/lib/run';

describe('table check', () => {
  it('passes for a copy of the example with version 2.5 (warnings only)', () => {
    const run = copyExample(example(), '2.5');
    const f = tableCheck(run);
    expect(f.filter((x) => x.severity !== 'warning')).toEqual([]);
  });

  it('finds an inconsistent C, a wrong relationship and a missing row', () => {
    const run = copyExample(example(), '2.5');
    run.draw.cText = 'Use recurs often';
    run.setup.b = 'the effect of Habit on Use';
    run.setup.n = '';
    const msgs = tableCheck(run).map((x) => `${x.step}: ${x.message}`);
    expect(msgs).toContain('3: C does not contain the words of the picked cell.');
    expect(msgs).toContain('7: Row b does not contain the picked relationship SI → BI.');
    expect(msgs).toContain('7: Fill row n.');
  });

  it('flags a selected instance that fails a criterion', () => {
    const run = copyExample(example(), '2.5');
    run.transform[0].criteria[2].value = 'no';
    expect(stepFindings(run, 6).map((x) => x.severity)).toContain('error');
    expect(stepState(run, 6)).toBe('needs attention');
  });

  it('gives step states', () => {
    const run = newRun();
    expect(stepState(run, 1)).toBe('empty');
    expect(stepState(copyExample(example(), '2.5'), 1)).toBe('complete');
    expect(stepState(example(), 13)).toBe('complete');
  });
});
