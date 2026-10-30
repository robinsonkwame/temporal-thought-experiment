// The pick of step 3 (brief, section 6, step 3) and the random change helper of step 5.
import type { Run, Pick, DimKey, ScaleKey, AuditRow } from './types';
import { STATIC } from './types';
import { cellInListWords } from './text';

export type PickKind = Pick['kind'];
export type Rng = (buf: Uint32Array) => Uint32Array;

const SCALE_ORDER: ScaleKey[] = ['micro', 'meso', 'artefact', 'macro'];

export const REPICK_REASONS = [
  'Outside what the theory’s constructs can register',
  'Same as an earlier run',
  'Other',
] as const;

const defaultRng: Rng = (buf) => crypto.getRandomValues(buf);

/** A uniform integer in [0, n), by rejection sampling over 32-bit values. */
export function randomIndex(n: number, rng: Rng = defaultRng): number {
  if (!Number.isInteger(n) || n < 1) throw new Error('Nothing to pick from.');
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    rng(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/** Cells of the temporal list in the chosen scales, row by row in list order, then micro, meso, artefact, macro. */
export function eligibleCells(scales: ScaleKey[]) {
  const dimOrder = STATIC.dimensions.map((d) => d.key);
  return STATIC.cells
    .filter((c) => scales.includes(c.scale))
    .sort((a, b) => dimOrder.indexOf(a.dimension) - dimOrder.indexOf(b.dimension) || SCALE_ORDER.indexOf(a.scale) - SCALE_ORDER.indexOf(b.scale));
}

export function eligibleRelationships(audit: AuditRow[], dim: DimKey | undefined): string[] {
  if (!dim) return [];
  return audit.filter((r) => r.answers[dim].value === 'no' && r.relationship.trim()).map((r) => r.relationship);
}

export function currentPick(picks: Pick[], kind: PickKind): Pick | undefined {
  for (let i = picks.length - 1; i >= 0; i--) if (picks[i].kind === kind) return picks[i];
  return undefined;
}

/** The reason a pick was set aside: the reason given with the next pick of the same kind; null if it is current. */
export function setAsideReason(p: Pick, picks: Pick[]): string | null {
  const i = picks.indexOf(p);
  if (p.kind === 'change') return null;
  const next = picks.slice(i + 1).find((q) => q.kind === p.kind);
  return next ? next.reason : null;
}

export class PickError extends Error {}

export interface PickOptions {
  how: 'random' | 'by hand';
  /** For a pick by hand: the index (0-based) of the chosen item. */
  chosen?: number;
  reason?: string;
  at?: string;
  rng?: Rng;
}

/**
 * Make one pick from a numbered list. A re-pick (an earlier pick of the kind exists) and a pick by hand
 * both need a reason. The returned pick records "k of n" (1-based) and its time.
 */
export function makePick(picks: Pick[], kind: PickKind, items: string[], opts: PickOptions): Pick {
  if (items.length === 0) throw new PickError('There is nothing eligible to pick.');
  const reason = (opts.reason ?? '').trim();
  const isRepick = kind !== 'change' && picks.some((p) => p.kind === kind);
  if ((isRepick || opts.how === 'by hand') && !reason) throw new PickError('Give a reason for this pick.');
  let i: number;
  if (opts.how === 'by hand') {
    if (opts.chosen === undefined || opts.chosen < 0 || opts.chosen >= items.length) throw new PickError('Choose an item.');
    i = opts.chosen;
  } else {
    i = randomIndex(items.length, opts.rng);
  }
  return { kind, value: items[i], index: i + 1, of: items.length, how: opts.how, at: opts.at ?? new Date().toISOString(), reason };
}

export function cellItemsFor(scales: ScaleKey[]): string[] {
  return eligibleCells(scales).map(cellInListWords);
}

export function conceptionItems(): string[] {
  return STATIC.conceptions.map((c) => c.name.toLowerCase());
}

/** Apply a pick to the draw: append it and set the current cell, conception or relationship. */
export function applyPick(run: Run, pick: Pick): Run {
  const draw = { ...run.draw, picks: [...run.draw.picks, pick] };
  if (pick.kind === 'cell') {
    const c = eligibleCells(run.draw.scales)[(pick.index ?? 1) - 1];
    draw.cell = { dimension: c.dimension, scale: c.scale, entry: c.entry };
  } else if (pick.kind === 'conception') {
    const c = STATIC.conceptions[(pick.index ?? 1) - 1];
    draw.conception = { n: c.n, name: c.name };
  } else if (pick.kind === 'relationship') {
    draw.relationship = pick.value;
  }
  return { ...run, draw };
}

/** Pick k admissible changes at random without replacement; each becomes a pick of kind "change". */
export function pickChanges(k: number, opts: { at?: string; rng?: Rng } = {}): Pick[] {
  const pool = STATIC.admissibleChanges.map((c, i) => ({ c, i }));
  const out: Pick[] = [];
  const at = opts.at ?? new Date().toISOString();
  for (let n = 0; n < Math.min(k, STATIC.admissibleChanges.length); n++) {
    const j = randomIndex(pool.length, opts.rng);
    const [{ c, i }] = pool.splice(j, 1);
    out.push({ kind: 'change', value: c, index: i + 1, of: STATIC.admissibleChanges.length, how: 'random', at, reason: '' });
  }
  return out;
}
