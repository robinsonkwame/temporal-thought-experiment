import { StepFrame } from '../components/StepFrame';
import { Editable, Check, TextArea } from '../components/Fields';
import { PickPanel } from '../components/PickPanel';
import { useRun } from '../components/RunContext';
import { STATIC, dimLabel } from '../lib/types';
import type { Pick, Run } from '../lib/types';
import { applyPick, cellItemsFor, conceptionItems, eligibleRelationships } from '../lib/pick';
import { cellWords, norm } from '../lib/text';

export function Step03Pick() {
  const { run, update, editable } = useRun();
  const set = (fn: (d: Run) => void) => update(3, fn);
  const onPick = (p: Pick) => update(3, (d) => {
    const prevWords = d.draw.cell ? cellWords(d.draw.cell.entry) : '';
    Object.assign(d, applyPick(d, p));
    if (p.kind === 'cell' && d.draw.cell && (!d.draw.cText.trim() || d.draw.cText === prevWords)) d.draw.cText = cellWords(d.draw.cell.entry);
  }, 'draw');
  const dim = run.draw.cell?.dimension;
  const rels = eligibleRelationships(run.audit, dim);
  const repicked = (['cell', 'conception', 'relationship'] as const).some((k) => run.draw.picks.filter((p) => p.kind === k).length > 1);
  const hasTerm = (t: string) => run.draw.relationshipTerms.some((x) => norm(x) === norm(t));

  return (
    <StepFrame step={3}>
      {repicked && <p className="notice">Re-picks are recorded. Report them with the run.</p>}
      <div className="pick-panels">
        <PickPanel kind="cell" title="Cell of the temporal list" items={cellItemsFor(run.draw.scales)} picks={run.draw.picks}
          onPick={onPick} editable={editable} disabledNote={run.draw.scales.length ? undefined : 'Choose the scales in step 2 first.'} />
        <PickPanel kind="conception" title="Conception of time" items={conceptionItems()} picks={run.draw.picks} onPick={onPick} editable={editable} />
        <PickPanel kind="relationship" title="Relationship" items={rels} picks={run.draw.picks} onPick={onPick} editable={editable}
          disabledNote={!dim ? 'Pick a cell first.' : rels.length ? undefined : `No relationship has “no” on ${dimLabel(dim).toLowerCase()} in the audit.`} />
      </div>
      <Editable>
        <TextArea label="C as written" rows={3} value={run.draw.cText} onChange={(v) => set((d) => { d.draw.cText = v; })}
          help="Write C in the words of the cell, at its scale. You may add degree or detail, but not a new condition." />
        <fieldset className="checks">
          <legend>Relationship terms</legend>
          {STATIC.relationshipTerms.map((t) => (
            <Check key={t} label={t} checked={hasTerm(t)} onChange={(on) => set((d) => {
              d.draw.relationshipTerms = on ? [...d.draw.relationshipTerms.filter((x) => norm(x) !== norm(t)), t]
                : d.draw.relationshipTerms.filter((x) => norm(x) !== norm(t));
            })} />
          ))}
        </fieldset>
      </Editable>
    </StepFrame>
  );
}
