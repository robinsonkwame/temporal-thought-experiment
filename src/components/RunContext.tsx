import { createContext, useContext } from 'react';
import type { Run } from '../lib/types';
import type { ChangeKind } from '../lib/deps';

export type RunMode = 'owned' | 'new' | 'shared' | 'example';

export interface RunCtx {
  /** The run as shown, with values derived from the replies where the document does not hold them. */
  run: Run;
  /** The run document as stored, for the JSON export. */
  doc: Run;
  editable: boolean;
  mode: RunMode;
  /** Path of the run without the step, e.g. "/run/abc" or "/example/utaut2". */
  base: string;
  id?: string;
  /** Change the run. The change marks dependent steps out of date. */
  update: (step: number, fn: (draft: Run) => void, kind?: ChangeKind) => void;
}

export const RunContext = createContext<RunCtx | null>(null);

export function useRun(): RunCtx {
  const ctx = useContext(RunContext);
  if (!ctx) throw new Error('useRun outside a run');
  return ctx;
}

export function addLog(d: Run, step: number, action: string, detail?: string) {
  d.log = [...(d.log ?? []), { at: new Date().toISOString(), step, action, ...(detail ? { detail } : {}) }];
}
