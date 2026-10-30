import { useEffect } from 'react';
import { StepFrame } from '../components/StepFrame';
import { Editable, TextArea } from '../components/Fields';
import { useRun } from '../components/RunContext';
import { setupKeysFor } from '../lib/types';
import type { Run, SetupKey } from '../lib/types';
import { setupLabel } from '../lib/render-tables';
import { selectedCard } from '../lib/checks';
import { STYLE_DEFAULT } from '../lib/run';

const HELP: Record<SetupKey, string> = {
  a: 'Each construct with its definition as the source states it, one per line, and the page.',
  b: 'Prefilled from the picked relationship. Write R in full.',
  c: 'R′ in full.',
  d: 'Prefilled from the selected candidate M. Write M in full.',
  e: 'The year, and what the account shows, for example the first months of use.',
  f: 'The year, and what the account shows, for the longer term.',
  g: 'Causes that would produce R′ without C.',
  h: 'The settings in which the theory is usually tested, and any that an earlier run returned.',
  i: 'The comparison group for the synthetic tables.',
  j: 'How each construct is measured.',
  k: 'The rows, and the direction and size of change from the comparison group to each horizon.',
  l: 'The pairs, and the direction and size of change.',
  m: 'The subgroups within the longer-term group, their sizes, the columns, and what each must show.',
  n: 'Name an author and a work whose prose the accounts follow. The prompt keeps its own rules: plain English, an observer who does not interpret, one first-person account, and no poems, myths or invented words.',
};

/** Candidates for row g: instances set aside for needing a construct outside the theory; mechanisms that failed the temporal check. */
export function excludedCauseCandidates(run: Run): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  for (const i of run.instances) {
    if (i.screening !== 'set aside' || !/construct/i.test(i.reason)) continue;
    const paren = i.reason.match(/\(([^)]+)\)/)?.[1];
    out.push({ label: `Instance ${i.id}, set aside: ${i.reason}`, text: paren ?? i.description });
  }
  for (const t of run.transform) {
    if (t.criteria[2]?.value === 'no' && t.candidateM.trim()) {
      out.push({ label: `Instance ${t.instanceId}, failed the temporal check${t.criteria[2].note ? `: ${t.criteria[2].note}` : ''}`, text: t.candidateM });
    }
  }
  return out;
}

export function Step07Setup() {
  const { run, update, editable } = useRun();
  const set = (k: SetupKey, v: string) => update(7, (d) => { d.setup[k] = v; }, k === 'n' ? 'style' : 'edit');
  const sel = selectedCard(run)[0];

  useEffect(() => {
    if (!editable) return;
    const fill: Partial<Record<SetupKey, string>> = {};
    if (!run.setup.b?.trim() && run.draw.relationship) fill.b = run.draw.relationship;
    if (!run.setup.d?.trim() && sel?.candidateM) fill.d = sel.candidateM;
    if (run.templateVersion === '2.5' && run.setup.n === undefined) fill.n = STYLE_DEFAULT;
    if (Object.keys(fill).length) update(7, (d) => { Object.assign(d.setup, fill); }, 'none');
    // Prefill once on opening the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepFrame step={7}>
      <Editable>
        {setupKeysFor(run.templateVersion).map((k) => (
          <TextArea key={k} label={setupLabel(k)} help={HELP[k]} rows={k === 'a' || k === 'k' || k === 'l' ? 6 : 3}
            value={run.setup[k] ?? ''} onChange={(v) => set(k, v)}>
            {k === 'g' && excludedCauseCandidates(run).length > 0 && (
              <div className="candidates">
                <p className="muted">Candidates from steps 5 and 6:</p>
                <ul>
                  {excludedCauseCandidates(run).map((c, i) => (
                    <li key={i}>
                      {c.label}{' '}
                      <button type="button" className="link-button" onClick={() => {
                        const cur = (run.setup.g ?? '').trim();
                        set('g', cur ? `${cur}; ${c.text}` : c.text);
                      }}>Insert<span className="visually-hidden"> “{c.text}”</span></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {k === 'n' && (
              <button type="button" className="button secondary small" onClick={() => set('n', STYLE_DEFAULT)}>Reset to default</button>
            )}
          </TextArea>
        ))}
      </Editable>
    </StepFrame>
  );
}
