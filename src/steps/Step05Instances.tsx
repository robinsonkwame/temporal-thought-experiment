import { useState } from 'react';
import { StepFrame } from '../components/StepFrame';
import { Editable, TextField, TextArea, Check, Radios } from '../components/Fields';
import { useRun } from '../components/RunContext';
import { STATIC } from '../lib/types';
import type { Run, Instance } from '../lib/types';
import { pickChanges } from '../lib/pick';
import { isAdmissibleChange } from '../lib/checks';
import { norm } from '../lib/text';

export function nextInstanceId(instances: Instance[]): string {
  const used = new Set(instances.map((i) => i.id));
  for (let n = 0; ; n++) {
    const id = n < 26 ? String.fromCharCode(65 + n) : `A${n - 25}`;
    if (!used.has(id)) return id;
  }
}

const OTHER = '__other__';

function ChangeType({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const admissible = STATIC.admissibleChanges.find((c) => norm(c) === norm(value));
  const [free, setFree] = useState(!admissible && value !== '');
  return (
    <div className="field">
      <label>
        Change type
        <select value={admissible ?? (free ? OTHER : '')} onChange={(e) => {
          if (e.target.value === OTHER) { setFree(true); if (admissible) onChange(''); }
          else { setFree(false); onChange(e.target.value); }
        }}>
          <option value="">Choose</option>
          {STATIC.admissibleChanges.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value={OTHER}>Other (free text)</option>
        </select>
      </label>
      {free && (
        <label>
          Change type, free text <span className="badge">free text</span>
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
      )}
    </div>
  );
}

export function Step05Instances() {
  const { run, update, editable } = useRun();
  const set = (fn: (d: Run) => void) => update(5, fn);
  const [k, setK] = useState(3);
  const blank = (d: Run, changeType = ''): Instance => ({
    id: nextInstanceId(d.instances), relationship: d.draw.relationship, changeType, terms: [], description: '', screening: 'survives', reason: '',
  });
  return (
    <StepFrame step={5}>
      {editable && (
        <div className="helper-box">
          <p>Optional: pick changes at random from the admissible changes, without replacement. Each pick is recorded.</p>
          <div className="row-actions">
            <label className="inline-label">Number of changes
              <input type="number" min={1} max={STATIC.admissibleChanges.length} value={k} onChange={(e) => setK(Number(e.target.value) || 1)} />
            </label>
            <button type="button" className="button secondary" onClick={() => set((d) => {
              const picks = pickChanges(k);
              d.draw.picks.push(...picks);
              for (const p of picks) d.instances.push(blank(d, p.value));
            })}>Pick changes at random</button>
          </div>
        </div>
      )}
      <Editable>
        {run.instances.map((inst, i) => {
          const f = (fn: (x: Instance) => void) => set((d) => fn(d.instances[i]));
          return (
            <section key={inst.id + i} className="card" aria-label={`Instance ${inst.id}`}>
              <div className="card-head">
                <h2>Instance {inst.id}</h2>
                {!isAdmissibleChange(inst.changeType) && inst.changeType && <span className="badge">free text</span>}
                <button type="button" className="button secondary small" onClick={() => set((d) => { d.instances.splice(i, 1); })}>Remove</button>
              </div>
              <div className="grid-2">
                <TextField label="Relationship" value={inst.relationship} onChange={(v) => f((x) => { x.relationship = v; })} />
                <ChangeType value={inst.changeType} onChange={(v) => f((x) => { x.changeType = v; })} />
              </div>
              <fieldset className="checks inline">
                <legend>Relationship terms</legend>
                {STATIC.relationshipTerms.map((t) => (
                  <Check key={t} label={t} checked={inst.terms.some((x) => norm(x) === norm(t))} onChange={(on) => f((x) => {
                    x.terms = on ? [...x.terms.filter((y) => norm(y) !== norm(t)), t] : x.terms.filter((y) => norm(y) !== norm(t));
                  })} />
                ))}
              </fieldset>
              <TextField label="One-line description" value={inst.description} onChange={(v) => f((x) => { x.description = v; })} />
              <Radios<'survives' | 'set aside'> legend="Screening" name={`screen-${i}`} value={inst.screening} inline
                options={[{ value: 'survives', label: 'Survives' }, { value: 'set aside', label: 'Set aside' }]}
                onChange={(v) => f((x) => { x.screening = v; })} />
              {inst.screening === 'set aside' && (
                <TextArea label="Reason for setting it aside (required)" rows={2} value={inst.reason} onChange={(v) => f((x) => { x.reason = v; })} />
              )}
            </section>
          );
        })}
        <button type="button" className="button secondary" onClick={() => set((d) => { d.instances.push(blank(d)); })}>Add an instance</button>
      </Editable>
    </StepFrame>
  );
}
