import { StepFrame } from '../components/StepFrame';
import { Editable } from '../components/Fields';
import { useRun } from '../components/RunContext';
import { move } from '../components/TableEditor';
import { AUDIT_DIMS, STATIC, dimLabel } from '../lib/types';
import type { Run } from '../lib/types';
import { emptyAuditRow } from '../lib/run';

export function Step01Audit() {
  const { run, update } = useRun();
  const set = (fn: (d: Run) => void) => update(1, fn);
  return (
    <StepFrame step={1}>
      <Editable>
        <div className="table-scroll">
          <table className="data audit">
            <caption>Audit: one row per relationship</caption>
            <thead>
              <tr>
                <th scope="col">Relationship</th>
                {AUDIT_DIMS.map((d) => (
                  <th key={d} scope="col">{dimLabel(d)}<span className="muted block">{STATIC.auditQuestions[d]}</span></th>
                ))}
                <th scope="col">Row</th>
              </tr>
            </thead>
            <tbody>
              {run.audit.map((r, i) => (
                <tr key={i}>
                  <td>
                    <input type="text" aria-label={`Relationship, row ${i + 1}`} value={r.relationship} placeholder="SI → BI"
                      onChange={(e) => set((d) => { d.audit[i].relationship = e.target.value; })} />
                  </td>
                  {AUDIT_DIMS.map((dim) => (
                    <td key={dim}>
                      <select aria-label={`${r.relationship || `Row ${i + 1}`}: ${dimLabel(dim)}`} value={r.answers[dim].value}
                        className={r.answers[dim].value ? '' : 'unanswered'}
                        onChange={(e) => set((d) => { d.audit[i].answers[dim].value = e.target.value as 'yes'; })}>
                        <option value="">Not answered</option>
                        <option value="yes">Yes</option>
                        <option value="partly">Partly</option>
                        <option value="no">No</option>
                      </select>
                      <input type="text" aria-label={`${r.relationship || `Row ${i + 1}`}: note on ${dimLabel(dim).toLowerCase()}`}
                        placeholder="Note" value={r.answers[dim].note}
                        onChange={(e) => set((d) => { d.audit[i].answers[dim].note = e.target.value; })} />
                    </td>
                  ))}
                  <td className="row-buttons">
                    <button type="button" className="button secondary small" disabled={i === 0}
                      onClick={() => set((d) => { d.audit = move(d.audit, i, -1); })}>Move up</button>
                    <button type="button" className="button secondary small" disabled={i === run.audit.length - 1}
                      onClick={() => set((d) => { d.audit = move(d.audit, i, 1); })}>Move down</button>
                    <button type="button" className="button secondary small"
                      onClick={() => set((d) => { d.audit.splice(i, 1); })}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="button secondary" onClick={() => set((d) => { d.audit.push(emptyAuditRow()); })}>Add a relationship</button>
      </Editable>
    </StepFrame>
  );
}
