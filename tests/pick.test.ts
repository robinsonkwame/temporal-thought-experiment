import { describe, it, expect } from 'vitest';
import {
  randomIndex, eligibleCells, eligibleRelationships, makePick, applyPick, PickError, cellItemsFor,
  conceptionItems, pickChanges, currentPick, setAsideReason,
} from '../src/lib/pick';
import { example } from './helpers';
import { newRun, emptyAuditRow } from '../src/lib/run';
import type { Rng } from '../src/lib/pick';

/** An rng that returns the given 32-bit values in turn. */
const seq = (...xs: number[]): Rng => { let i = 0; return (b) => { b[0] = xs[i++ % xs.length]; return b; }; };

describe('pick', () => {
  it('numbers eligible cells row by row in list order, then micro, meso, artefact, macro', () => {
    const cells = eligibleCells(['meso', 'micro']);
    expect(cells.length).toBe(12);
    expect(cells.map((c) => `${c.dimension}/${c.scale}`).slice(0, 4)).toEqual(['speed/micro', 'speed/meso', 'duration/micro', 'duration/meso']);
    // The paper's pick: Rhythm, micro is cell 7 of 12.
    expect(cells[6]).toMatchObject({ dimension: 'rhythm', scale: 'micro' });
    expect(eligibleCells(['macro', 'artefact', 'micro', 'meso']).length).toBe(24);
    expect(cellItemsFor(['micro', 'meso'])[6]).toBe('Rhythm, cycle and entrainment; micro: “attention and interruption rhythms”');
  });

  it('lists eligible relationships in audit order with "no" on the dimension', () => {
    const run = example();
    expect(eligibleRelationships(run.audit, 'rhythm').length).toBe(10);
    expect(eligibleRelationships(run.audit, 'duration')).toEqual(['PE → BI', 'PV → BI']);
    expect(eligibleRelationships(run.audit, undefined)).toEqual([]);
  });

  it('chooses uniformly', () => {
    const counts = new Array(7).fill(0);
    for (let i = 0; i < 70000; i++) counts[randomIndex(7)]++;
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(600);
  });

  it('rejects values that would bias the choice', () => {
    // n = 3: limit = floor(2^32 / 3) * 3 = 4294967295; the value 4294967295 is rejected.
    expect(randomIndex(3, seq(4294967295, 4))).toBe(1);
  });

  it('records k of n, the time and how', () => {
    const p = makePick([], 'conception', conceptionItems(), { how: 'random', rng: seq(1), at: 't' });
    expect(p).toEqual({ kind: 'conception', value: 'process time', index: 2, of: 10, how: 'random', at: 't', reason: '' });
  });

  it('needs a reason for a re-pick and for a pick by hand', () => {
    const first = makePick([], 'conception', conceptionItems(), { how: 'random', rng: seq(0) });
    expect(() => makePick([first], 'conception', conceptionItems(), { how: 'random' })).toThrow(PickError);
    expect(() => makePick([first], 'conception', conceptionItems(), { how: 'random', reason: '  ' })).toThrow(PickError);
    expect(() => makePick([], 'conception', conceptionItems(), { how: 'by hand', chosen: 3 })).toThrow(PickError);
    const again = makePick([first], 'conception', conceptionItems(), { how: 'random', reason: 'Same as an earlier run', rng: seq(4) });
    expect(again.reason).toBe('Same as an earlier run');
    const byHand = makePick([], 'conception', conceptionItems(), { how: 'by hand', chosen: 3, reason: 'testing' });
    expect(byHand).toMatchObject({ index: 4, of: 10, how: 'by hand', value: 'b-series time' });
  });

  it('keeps every pick; the last of each kind is current', () => {
    let run = newRun();
    run.audit = [emptyAuditRow('A → B')];
    run.audit[0].answers.rhythm.value = 'no';
    const items = cellItemsFor(run.draw.scales);
    const p1 = makePick(run.draw.picks, 'cell', items, { how: 'random', rng: seq(0) });
    run = applyPick(run, p1);
    const p2 = makePick(run.draw.picks, 'cell', items, { how: 'random', rng: seq(6), reason: 'Other: x' });
    run = applyPick(run, p2);
    const p3 = makePick(run.draw.picks, 'relationship', eligibleRelationships(run.audit, run.draw.cell!.dimension), { how: 'random', rng: seq(0) });
    run = applyPick(run, p3);
    expect(run.draw.picks.length).toBe(3);
    expect(currentPick(run.draw.picks, 'cell')).toBe(p2);
    expect(run.draw.cell).toMatchObject({ dimension: 'rhythm', scale: 'micro' });
    expect(run.draw.relationship).toBe('A → B');
    expect(setAsideReason(p1, run.draw.picks)).toBe('Other: x');
    expect(setAsideReason(p2, run.draw.picks)).toBeNull();
  });

  it('picks changes without replacement', () => {
    const picks = pickChanges(7, { rng: seq(0) });
    expect(new Set(picks.map((p) => p.value)).size).toBe(7);
    expect(picks.every((p) => p.kind === 'change' && p.of === 7)).toBe(true);
  });
});
