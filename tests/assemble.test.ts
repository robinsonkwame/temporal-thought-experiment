import { describe, it, expect } from 'vitest';
import { example, fixture } from './helpers';
import {
  assembleSlotPrompt, assembleStage1Prompt, assembleStage2Prompt, assembleCutoffPrompt,
  PH_TABLES, PH_BLOCK, PH_SETTING, PH_CUTOFF, cutoffLines,
} from '../src/lib/assemble';
import { TEMPLATES, checklistClauses } from '../src/lib/templates';
import { renderTables } from '../src/lib/render-tables';
import type { Run, TemplateVersion } from '../src/lib/types';

/** The template with only the given placeholders replaced, built independently of assemble.ts. */
function expected(template: string, subs: [string, string][]): string {
  let out = template;
  for (const [ph, v] of subs) {
    const i = out.indexOf(ph);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(out.indexOf(ph, i + 1)).toBe(-1);
    out = out.slice(0, i) + v + out.slice(i + ph.length);
  }
  return out;
}

function runFor(v: TemplateVersion): Run {
  const r = example();
  r.templateVersion = v;
  r.provoke.slot!.confirmedBlock = fixture(`reference_slot_values_v${v}.txt`).trimEnd();
  r.provoke.stage1!.settings = [
    { number: 1, rawText: '1. A setting with $& and $1 in it.\n\nTension: one.', fields: {} },
    { number: 2, rawText: '2. Another.', fields: {} },
  ];
  r.provoke.stage1!.chosen = 1;
  return r;
}

describe('prompt assembly', () => {
  for (const v of ['2.4', '2.5'] as const) {
    const t = TEMPLATES[v];
    const r = runFor(v);
    const block = r.provoke.slot!.confirmedBlock!;

    it(`prompt 1, version ${v}`, () => {
      expect(assembleSlotPrompt(r)).toBe(expected(t.slot, [[PH_TABLES, renderTables(r)]]));
    });
    it(`prompt 2, version ${v}`, () => {
      expect(assembleStage1Prompt(r)).toBe(expected(t.stage1, [[PH_BLOCK, block]]));
    });
    it(`prompt 3, version ${v}`, () => {
      const p = assembleStage2Prompt(r);
      expect(p).toBe(expected(t.stage2, [[PH_BLOCK, block], [PH_SETTING, '1. A setting with $& and $1 in it.\n\nTension: one.']]));
      expect(p).toContain('{{H1}}');
    });
    it(`prompt 4, version ${v}`, () => {
      const lines = cutoffLines(r);
      expect(lines.split('\n').map((l) => l.split(':')[0])).toEqual(['PRIOR_EVIDENCE', 'TEMPORAL_FEATURE', 'PROPOSAL']);
      for (const l of lines.split('\n')) expect(block).toContain(l);
      expect(assembleCutoffPrompt(r)).toBe(expected(t.cutoff, [[PH_CUTOFF, lines]]));
    });
    it(`never substitutes {{NAME}} markers, version ${v}`, () => {
      const markers = (s: string) => (s.match(/\{\{[A-Z0-9_]+\}\}/g) ?? []).length;
      expect(markers(assembleStage2Prompt(r))).toBe(markers(t.stage2));
      expect(markers(assembleCutoffPrompt(r))).toBe(markers(t.cutoff));
    });
    it(`splits the check list into clauses, version ${v}`, () => {
      const c = checklistClauses(v);
      expect(c.clauses.length).toBeGreaterThan(6);
      expect(c.clauses[0]).toBe('gives an excluded cause as the reason for use or for M');
      expect(c.tail.startsWith('Do not edit the accounts')).toBe(true);
    });
  }
});
