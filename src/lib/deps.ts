// Out-of-date marking between steps (brief, section 6.0). Later work is never deleted, only marked.
import type { Run } from './types';

/** 'none' is a change that makes nothing out of date, such as a log entry or "Mark as checked". */
export type ChangeKind = 'edit' | 'draw' | 'style' | 'confirm' | 'choose' | 'none';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** The steps that a change makes out of date. */
export function dependents(step: number, kind: ChangeKind = 'edit'): number[] {
  if (kind === 'none') return [];
  if (kind === 'confirm') return range(10, 14);
  if (kind === 'choose') return [11, 12, 14];
  if (kind === 'style') return range(9, 14);
  if (step === 3 && kind === 'draw') return [...range(4, 7), ...range(9, 14)];
  if (step >= 0 && step <= 7) return range(9, 14);
  return [];
}

/** Whether a step holds work that a change upstream could make out of date. */
export function stepHasWork(run: Run, step: number): boolean {
  const p = run.provoke;
  switch (step) {
    case 4: return run.representation.length > 0;
    case 5: return run.instances.length > 0;
    case 6: return run.transform.length > 0;
    case 7: return 'abcdefghijklm'.split('').some((k) => (run.setup[k as 'a'] ?? '').trim() !== '');
    case 9: return (p.slot?.attempts.length ?? 0) > 0;
    case 10: return !!(p.stage1?.exchange.copiedAt || p.stage1?.exchange.replyText);
    case 11: return (p.stage2?.drafts.length ?? 0) > 0;
    case 12: return (p.stage2?.edits.length ?? 0) > 0 || !!p.stage2?.drafts.some((d) => d.status === 'kept');
    case 13: return !!(p.cutoff?.exchange.copiedAt || p.cutoff?.exchange.replyText);
    case 14: return [9, 10, 11, 12, 13].some((s) => stepHasWork(run, s));
    default: return false;
  }
}

/**
 * Mark the dependents of a change. A group of dependent steps (4 to 7, or 9 to 14) is marked as a whole
 * once any step in it holds work; a run that has not reached the group is left alone.
 */
export function markStale(run: Run, step: number, kind: ChangeKind = 'edit'): Run {
  const deps = dependents(step, kind);
  if (!deps.length) return run;
  const groups = [deps.filter((s) => s <= 7), deps.filter((s) => s >= 9)];
  const marked = groups.filter((g) => g.some((s) => stepHasWork(run, s))).flat().map(String);
  if (!marked.length) return run;
  const stale = [...new Set([...(run.stale ?? []), ...marked])].sort((a, b) => Number(a) - Number(b));
  if (stale.length === (run.stale ?? []).length) return run;
  return { ...run, stale };
}

export function isStale(run: Run, step: number): boolean {
  return (run.stale ?? []).includes(String(step));
}

/** "Mark as checked": clear the mark and log it. */
export function markChecked(run: Run, step: number, at = new Date().toISOString()): Run {
  return {
    ...run,
    stale: (run.stale ?? []).filter((s) => s !== String(step)),
    log: [...(run.log ?? []), { at, step, action: 'Marked as checked' }],
  };
}
