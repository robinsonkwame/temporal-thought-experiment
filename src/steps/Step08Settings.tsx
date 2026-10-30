import { StepFrame } from '../components/StepFrame';
import { Editable, TextField, Check } from '../components/Fields';
import { useRun } from '../components/RunContext';
import type { Run } from '../lib/types';

type S = Run['provoke']['settings'];

export function Step08Settings() {
  const { run, update } = useRun();
  const s = run.provoke.settings;
  const set = <K extends keyof S>(k: K, v: S[K]) => update(8, (d) => { d.provoke.settings[k] = v; });
  return (
    <StepFrame step={8}>
      <Editable>
        <div className="grid-2">
          <TextField label="App" value={s.app} onChange={(v) => set('app', v)} />
          <TextField label="Model" value={s.model} onChange={(v) => set('model', v)} />
          <TextField label="Model identifier" value={s.modelId} onChange={(v) => set('modelId', v)} />
          <TextField label="Knowledge cut-off" value={s.knowledgeCutoff} onChange={(v) => set('knowledgeCutoff', v)} />
          <TextField label="Training data to" value={s.trainingDataTo} onChange={(v) => set('trainingDataTo', v)} />
        </div>
        <fieldset className="checks">
          <legend>Settings in the Claude app</legend>
          <Check label="Extended thinking on" checked={s.extendedThinking} onChange={(v) => set('extendedThinking', v)} />
          <Check label="Memory on" checked={s.memory} onChange={(v) => set('memory', v)} />
          <Check label="Tools on" checked={s.tools} onChange={(v) => set('tools', v)} />
        </fieldset>
      </Editable>
    </StepFrame>
  );
}
