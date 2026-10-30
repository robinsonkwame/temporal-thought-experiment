import { useState } from 'react';
import { StepFrame } from '../components/StepFrame';
import { Editable, TextField, Select, Radios, TextArea } from '../components/Fields';
import { useRun } from '../components/RunContext';
import { STATIC } from '../lib/types';
import type { Run, TemplateVersion } from '../lib/types';

export function TemporalList() {
  return (
    <div className="table-scroll">
      <table className="data">
        <caption>The temporal list</caption>
        <thead>
          <tr>
            <th scope="col">Dimension</th>
            {STATIC.scales.map((s) => <th key={s.key} scope="col">{s.label}: {s.description}</th>)}
          </tr>
        </thead>
        <tbody>
          {STATIC.dimensions.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}<span className="muted block">{d.definition}</span></th>
              {STATIC.scales.map((s) => <td key={s.key}>{STATIC.cells.find((c) => c.dimension === d.key && c.scale === s.key)?.entry}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Step00Start() {
  const { run, update } = useRun();
  const [showList, setShowList] = useState(false);
  const set = (fn: (d: Run) => void) => update(0, fn);
  return (
    <StepFrame step={0}>
      <Editable>
        <TextField label="Run title" value={run.title} onChange={(v) => set((d) => { d.title = v; })} />
        <TextField label="Theory name" value={run.theory.name} onChange={(v) => set((d) => { d.theory.name = v; })} />
        <TextArea label="Full reference" rows={2} value={run.theory.source} onChange={(v) => set((d) => { d.theory.source = v; })} />
        <div className="field-row">
          <Select label="Unit of analysis" value={run.theory.unit}
            options={['individual', 'group', 'organisation', 'other'].map((u) => ({ value: u, label: u }))}
            onChange={(v) => set((d) => {
              d.theory.unit = v as Run['theory']['unit'];
              // An individual unit preselects micro and meso; other units start empty. A fixed rule is left alone.
              if (!d.draw.ruleFixedAt && !d.draw.picks.length) d.draw.scales = v === 'individual' ? [...STATIC.drawingRuleDefault.individual] : [];
            })} />
          <TextField label="Note on the unit" value={run.theory.unitNote} onChange={(v) => set((d) => { d.theory.unitNote = v; })} />
        </div>
        <Radios<TemplateVersion> legend="Prompt version" name="version" value={run.templateVersion}
          options={[{ value: '2.5', label: '2.5 (default)' }, { value: '2.4', label: '2.4, the version of the paper’s run' }]}
          onChange={(v) => set((d) => { d.templateVersion = v; })} />
      </Editable>
      <button type="button" className="button secondary" aria-expanded={showList} onClick={() => setShowList(!showList)}>
        {showList ? 'Hide the temporal list' : 'Show the temporal list'}
      </button>
      {showList && <TemporalList />}
    </StepFrame>
  );
}
