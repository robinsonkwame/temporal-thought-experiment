import { describe, it, expect } from 'vitest';
import { example } from './helpers';
import { markStale, markChecked, dependents } from '../src/lib/deps';
import { copyExample } from '../src/lib/run';

describe('out-of-date marking', () => {
  it('lists the dependents of each kind of change', () => {
    expect(dependents(1)).toEqual([9, 10, 11, 12, 13, 14]);
    expect(dependents(7, 'style')).toEqual([9, 10, 11, 12, 13, 14]);
    expect(dependents(9, 'confirm')).toEqual([10, 11, 12, 13, 14]);
    expect(dependents(10, 'choose')).toEqual([11, 12, 14]);
    expect(dependents(3, 'draw')).toEqual([4, 5, 6, 7, 9, 10, 11, 12, 13, 14]);
    expect(dependents(8)).toEqual([]);
  });

  it('marks steps 9 to 14 when step 1 changes after step 11, and deletes nothing', () => {
    const run = example(); // Provoke is done in the example.
    const before = JSON.stringify({ ...run, stale: undefined });
    const after = markStale(run, 1);
    expect(after.stale).toEqual(['9', '10', '11', '12', '13', '14']);
    expect(JSON.stringify({ ...after, stale: undefined })).toBe(before);
  });

  it('marks steps 4 to 7 on a new draw', () => {
    const run = copyExample(example(), '2.5');
    expect(markStale(run, 3, 'draw').stale).toEqual(['4', '5', '6', '7']);
    expect(markStale(run, 3, 'edit').stale ?? []).toEqual([]);
  });

  it('leaves a run that has not reached Provoke alone', () => {
    const run = copyExample(example(), '2.5');
    expect(markStale(run, 1)).toBe(run);
  });

  it('marks 11, 12 and 14 on a new choice of setting', () => {
    expect(markStale(example(), 10, 'choose').stale).toEqual(['11', '12', '14']);
  });

  it('clears a mark with "Mark as checked" and logs it', () => {
    const run = markChecked(markStale(example(), 1), 12, 't');
    expect(run.stale).toEqual(['9', '10', '11', '13', '14']);
    expect(run.log).toEqual([{ at: 't', step: 12, action: 'Marked as checked' }]);
  });
});
