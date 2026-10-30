import { StepFrame } from '../components/StepFrame';
import { Editable, TextField, TextArea, Radios } from '../components/Fields';
import { useRun } from '../components/RunContext';
import { STATIC } from '../lib/types';
import type { Run, TransformCard } from '../lib/types';
import { survivors } from '../lib/render-tables';
import { cellInListWords } from '../lib/text';

function ensureCard(d: Run, instanceId: string): TransformCard {
  let c = d.transform.find((t) => t.instanceId === instanceId);
  if (!c) {
    c = { instanceId, cWords: d.draw.cell ? cellInListWords(d.draw.cell) : '', candidateM: '',
      criteria: [0, 1, 2, 3].map(() => ({ value: '' as const, note: '' })), selected: false };
    d.transform.push(c);
  }
  return c;
}

export function Step06Transform() {
  const { run, update } = useRun();
  const set = (id: string, fn: (c: TransformCard, d: Run) => void) => update(6, (d) => fn(ensureCard(d, id), d));
  const prefill = run.draw.cell ? cellInListWords(run.draw.cell) : '';
  return (
    <StepFrame step={6}>
      {survivors(run).length === 0 && <p className="muted">No instance survives the screening of step 5.</p>}
      <Editable>
        {survivors(run).map((inst) => {
          const c = run.transform.find((t) => t.instanceId === inst.id);
          return (
            <section key={inst.id} className="card" aria-label={`Instance ${inst.id}`}>
              <div className="card-head"><h2>Instance {inst.id}</h2><span className="muted">{inst.changeType}: {inst.description}</span></div>
              <TextField label="C in the list's words" value={c?.cWords ?? prefill} onChange={(v) => set(inst.id, (x) => { x.cWords = v; })} />
              <TextArea label="Candidate M" rows={3} value={c?.candidateM ?? ''} onChange={(v) => set(inst.id, (x) => { x.candidateM = v; })} />
              {STATIC.transformCriteria.map((text, n) => (
                <div key={n} className="criterion">
                  <Radios<'yes' | 'no'> legend={`${n + 1}. ${text}`} name={`crit-${inst.id}-${n}`} inline value={c?.criteria[n].value ?? ''}
                    options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                    onChange={(v) => set(inst.id, (x) => { x.criteria[n].value = v; })} />
                  <TextField label={`Note on criterion ${n + 1}`} value={c?.criteria[n].note ?? ''} onChange={(v) => set(inst.id, (x) => { x.criteria[n].note = v; })} />
                </div>
              ))}
              <label className="check selected-check">
                <input type="radio" name="selected-instance" checked={!!c?.selected}
                  onChange={() => set(inst.id, (x, d) => { for (const t of d.transform) t.selected = false; x.selected = true; })} />
                <span>Select this instance</span>
              </label>
            </section>
          );
        })}
      </Editable>
    </StepFrame>
  );
}
