import { describe, it, expect } from 'vitest';
import { example } from './helpers';
import { renderTables, cell } from '../src/lib/render-tables';
import { assembleSlotPrompt, PH_TABLES } from '../src/lib/assemble';
import { TEMPLATES } from '../src/lib/templates';
import { setupKeysFor } from '../src/lib/types';

const CAPTIONS = ['Table 1. Audit', 'Table 2. Draw record', 'Table 3. Representation', 'Table 4. Candidate instances', 'Table 5. Transform', 'Table 6. Provoke set-up'];

describe('rendering the six tables (golden test)', () => {
  const run = example();
  const out = renderTables(run);

  it('has the six captions in order', () => {
    const at = CAPTIONS.map((c) => out.indexOf(`${c}\n\n|`));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('contains every value of the tables', () => {
    const values: string[] = [run.theory.name, run.theory.source, run.theory.unitNote, run.draw.rule, run.draw.cText, run.draw.relationship,
      run.draw.cell!.entry, ...run.draw.relationshipTerms, ...run.draw.picks.map((p) => p.value)];
    for (const a of run.audit) {
      values.push(a.relationship);
      for (const v of Object.values(a.answers)) if (v.note) values.push(v.note);
    }
    for (const r of run.representation) values.push(...Object.values(r));
    for (const i of run.instances) {
      // Table 4 shows survivors in full; a set-aside instance appears as "id, description: reason" under the table.
      if (i.screening === 'survives') values.push(i.relationship, i.changeType, ...i.terms, i.description);
      else values.push(`${i.id}, ${i.description}: ${i.reason}`);
    }
    for (const t of run.transform) values.push(t.cWords, t.candidateM, ...t.criteria.map((c) => c.note).filter(Boolean));
    for (const k of setupKeysFor(run.templateVersion)) values.push(run.setup[k]!);
    const missing = values.filter((v) => !out.includes(cell(v)));
    expect(missing).toEqual([]);
  });

  it('formats the draw record as specified', () => {
    expect(out).toContain('| Cell picked | Cell 7 of 12. Rhythm, cycle and entrainment; micro: “attention and interruption rhythms (Rennecker & Godwin, 2005; Addas & Pinsonneault, 2018)” |');
    expect(out).toContain('Conception 2 of 10: process time');
    expect(out).toContain('Relationship 3 of 10: SI → BI');
    expect(out).toContain('cell, random, 2026-10-29: Rhythm, cycle and entrainment; micro: “attention and interruption rhythms”<br>conception, random');
    expect(out).toContain('| Relationship | Duration | Sequence | Rhythm, cycle | Timing | Speed | Trajectory |');
    expect(out).toContain('| EE → BI | Yes (experience) | No | No | No | No | Partly (weaker) |');
    expect(out).toContain('|  | Instance A | Instance B | Instance C |');
    expect(out).toContain('Set aside: D, Moderation of the direct effect by the frequency of interruption: Requires a construct outside UTAUT2 (frequency of interruption); E,');
    expect(out).toContain('| 2. R′ detectable | Yes: SI and EE correlation; SI → EE path | Yes: SI → BI path | No: no established measure separates rhythm from elapsed time |');
    expect(out).toContain('| Selected | Yes | No | No |');
  });

  it('renders row n only for version 2.5', () => {
    expect(out).not.toContain('n. Style model');
    expect(renderTables({ ...run, templateVersion: '2.5' })).toContain('| n. Style model for the accounts | Ursula K. Le Guin');
  });

  it('inserts the tables into prompt 1 and changes nothing else', () => {
    for (const v of ['2.4', '2.5'] as const) {
      const r = { ...run, templateVersion: v };
      const t = TEMPLATES[v].slot;
      const i = t.indexOf(PH_TABLES);
      const p = assembleSlotPrompt(r);
      const tables = renderTables(r);
      expect(p.slice(0, i)).toBe(t.slice(0, i));
      expect(p.slice(i, i + tables.length)).toBe(tables);
      expect(p.slice(i + tables.length)).toBe(t.slice(i + PH_TABLES.length));
    }
  });
});
