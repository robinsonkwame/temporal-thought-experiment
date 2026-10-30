// Debug mode for screenshots: fills the reply boxes with the expected replies so a run can be clicked through.
// Turn it on with ?debug=1 and off with ?debug=0; it lasts for the browser tab.
import { useEffect, useState } from 'react';
import exampleJson from '../content/example_utaut2.json';
import ref25 from '../../tests/fixtures/reference_slot_values_v2.5.txt?raw';
import type { Run } from './types';

const KEY = 'tte_debug';

export function isDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('debug');
    if (q === '1') sessionStorage.setItem(KEY, '1');
    if (q === '0') sessionStorage.removeItem(KEY);
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export interface Expected { text: string; label: string }

const ex = exampleJson.provoke;
const PAPER = 'the real reply of the paper’s run (prompts v2.4)';

/** The expected reply for a prompt step, if one exists. */
export function expectedReply(step: number, run: Run): Expected | null {
  const v25 = run.templateVersion === '2.5';
  const note = v25 ? `${PAPER}; no real v2.5 reply exists` : PAPER;
  switch (step) {
    case 9: return v25
      ? { text: ref25, label: 'the reference slot block for v2.5 (expected values, not a model reply)' }
      : { text: ex.slot.attempts[0].replyText, label: PAPER };
    case 10: return { text: ex.stage1.exchange.replyText, label: note };
    case 11: return { text: ex.stage2.drafts[0].replyText, label: note };
    case 13: return { text: ex.cutoff.exchange.replyText, label: PAPER };
    default: return null;
  }
}

export const EXPECTED_CHOICE = { number: ex.stage1.chosen, reason: ex.stage1.reason };

// Fill actions that the mounted components offer to the debug panel.
type Action = { id: string; label: string; run: () => void };
let actions: Action[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Offer a fill action to the debug panel while the component is mounted (and debug mode is on). */
export function useDebugAction(id: string, label: string | null, run: () => void) {
  useEffect(() => {
    if (!label || !isDebug()) return;
    actions = [...actions.filter((a) => a.id !== id), { id, label, run }];
    emit();
    return () => { actions = actions.filter((a) => a.id !== id); emit(); };
  });
}

export function useDebugActions(): Action[] {
  const [, setN] = useState(0);
  useEffect(() => {
    const l = () => setN((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return actions;
}
