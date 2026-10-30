import { StepFrame } from '../components/StepFrame';
import { Editable, TextField, TextArea } from '../components/Fields';
import { TableEditor, move } from '../components/TableEditor';
import { useRun } from '../components/RunContext';
import type { Run } from '../lib/types';
import { AUDIT_DIMS, dimLabel } from '../lib/types';
import { listedRelationships, norm, capitalise } from '../lib/text';

type Row = Run['representation'][number];

/** The dimensions the audit answers "no" for any relationship listed in the row. */
export function computeUnstated(run: Run, row: Row): string {
  const rels = listedRelationships(row.relationships);
  const audit = run.audit.filter((a) => rels.includes(norm(a.relationship)));
  if (!audit.length) return '';
  const dims = AUDIT_DIMS.filter((d) => audit.some((a) => a.answers[d].value === 'no'));
  if (dims.length === 6) return 'All six';
  if (!dims.length) return 'None';
  return capitalise(dims.map((d) => dimLabel(d).split(/[ ,]/)[0].toLowerCase()).join(', '));
}

const emptyRow = (): Row => ({ construct: '', role: '', relationships: '', moderators: '', scope: '', unstated: '' });

export function Step04Representation() {
  const { run, update } = useRun();
  const set = (fn: (d: Run) => void) => update(4, fn);
  const field = (i: number, k: keyof Row) => (v: string) => set((d) => { d.representation[i][k] = v; });
  return (
    <StepFrame step={4}>
      <Editable>
        <TableEditor rows={run.representation} addLabel="Add a construct" className="cards"
          rowLabel={(r, i) => r.construct || `row ${i + 1}`}
          onAdd={() => set((d) => { d.representation.push(emptyRow()); })}
          onRemove={(i) => set((d) => { d.representation.splice(i, 1); })}
          onMove={(i, delta) => set((d) => { d.representation = move(d.representation, i, delta); })}
          render={(r, i) => (
            <div className="grid-2">
              <TextField label="Construct" value={r.construct} onChange={field(i, 'construct')} placeholder="Social Influence (SI)" />
              <TextField label="Role" value={r.role} onChange={field(i, 'role')} />
              <TextArea label="Hypothesised relationships, with signs" rows={2} value={r.relationships} onChange={field(i, 'relationships')} />
              <TextArea label="Moderators" rows={2} value={r.moderators} onChange={field(i, 'moderators')} />
              <TextArea label="Stated scope conditions" rows={2} value={r.scope} onChange={field(i, 'scope')} />
              <TextArea label="Dimensions the theory leaves unstated" rows={2} value={r.unstated} onChange={field(i, 'unstated')}
                help="Computed from the audit; you may edit it.">
                <button type="button" className="button secondary small" onClick={() => set((d) => { d.representation[i].unstated = computeUnstated(d, d.representation[i]); })}>
                  Compute from the audit
                </button>
              </TextArea>
            </div>
          )} />
        {run.representation.length > 0 && (
          <button type="button" className="button secondary" onClick={() => set((d) => {
            for (const row of d.representation) row.unstated = computeUnstated(d, row) || row.unstated;
          })}>Compute every row from the audit</button>
        )}
      </Editable>
    </StepFrame>
  );
}
