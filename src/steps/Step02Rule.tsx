import { StepFrame } from '../components/StepFrame';
import { Editable, Check, TextArea } from '../components/Fields';
import { useRun, addLog } from '../components/RunContext';
import { STATIC } from '../lib/types';
import type { Run, ScaleKey } from '../lib/types';
import { fmtDateTime } from '../lib/text';

export function listWords(xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function ruleText(scales: ScaleKey[]): string {
  const ordered = STATIC.scales.map((s) => s.key).filter((k) => scales.includes(k));
  return `Restrict the pick to the scales ${listWords(ordered) || '{list}'}; pick one cell at random among them, one conception of time, and one relationship among those whose audit answer on the picked dimension is 'no'; record each pick with its date.`;
}

export function Step02Rule() {
  const { run, update, editable } = useRun();
  const set = (fn: (d: Run) => void) => update(2, fn);
  const fixed = !!run.draw.ruleFixedAt;
  const shown = run.draw.rule || ruleText(run.draw.scales);

  function toggle(k: ScaleKey, on: boolean) {
    set((d) => {
      const before = ruleText(d.draw.scales);
      d.draw.scales = on ? [...d.draw.scales, k] : d.draw.scales.filter((s) => s !== k);
      if (!d.draw.rule || d.draw.rule === before) d.draw.rule = ruleText(d.draw.scales);
    });
  }

  return (
    <StepFrame step={2}>
      <Editable>
        <fieldset className="checks" disabled={fixed}>
          <legend>Scales the unit of analysis can register</legend>
          {STATIC.scales.map((s) => (
            <Check key={s.key} label={<><strong>{s.label}</strong>: {s.description}</>} checked={run.draw.scales.includes(s.key)}
              onChange={(on) => toggle(s.key, on)} />
          ))}
        </fieldset>
        <p className="help">{STATIC.drawingRuleDefault.note}</p>
        <TextArea label="The rule" rows={4} value={shown} readOnly={fixed}
          onChange={(v) => set((d) => { d.draw.rule = v; })} />
      </Editable>
      {fixed ? (
        <div className="row-actions">
          <p><strong>Fixed</strong> {fmtDateTime(run.draw.ruleFixedAt)}.</p>
          {editable && (
            <button type="button" className="button secondary" onClick={() => {
              if (!window.confirm('The rule is fixed. Change it? The change is logged.')) return;
              set((d) => {
                addLog(d, 2, 'Rule opened for change after it was fixed', `Fixed ${fmtDateTime(d.draw.ruleFixedAt)}: ${d.draw.rule}`);
                d.draw.ruleFixedAt = undefined;
              });
            }}>Change the fixed rule</button>
          )}
        </div>
      ) : (
        editable && (
          <button type="button" className="button primary" disabled={!run.draw.scales.length} onClick={() => set((d) => {
            const reopened = (d.log ?? []).some((l) => l.step === 2 && l.action.startsWith('Rule opened'));
            d.draw.rule = shown;
            d.draw.ruleFixedAt = new Date().toISOString();
            if (reopened) addLog(d, 2, 'Rule fixed again', d.draw.rule);
          })}>Fix the rule</button>
        )
      )}
    </StepFrame>
  );
}
