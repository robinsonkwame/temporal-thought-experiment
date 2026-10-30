import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepFrame } from '../components/StepFrame';
import { TextArea, TextField, Select } from '../components/Fields';
import { useRun } from '../components/RunContext';
import type { Run } from '../lib/types';
import { splitStage2, type Paragraph } from '../lib/lint';
import { parseSyntheticTables, impliedPaths, fmtCoef, type MdTable } from '../lib/paths';
import { fmtDateTime } from '../lib/text';

export const EDIT_RULES = [
  'Construct outside the theory', 'Condition outside C', 'Excluded cause as reason for use or for M', 'Theoretical or TRIZ term',
  'Summary of meaning or moral', 'Aligns the setting with IS use', 'Sharpens the link to the change from R to R′', 'Other',
];

type S2 = NonNullable<Run['provoke']['stage2']>;

export function currentText(s2: S2 | undefined, p: Paragraph): string {
  const edits = (s2?.edits ?? []).filter((e) => e.tag === p.tag);
  return edits.length ? edits[edits.length - 1].after : p.text;
}

function ParagraphView({ p }: { p: Paragraph }) {
  const { run, update, editable } = useRun();
  const s2 = run.provoke.stage2;
  const now = currentText(s2, p);
  const edited = now !== p.text;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(now);
  const [rule, setRule] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="paragraph" id={p.tag}>
      <div className="card-head">
        <span className="tagname">[{p.tag}]</span>
        {edited && <span className="badge">edited</span>}
        {editable && !editing && (
          <button type="button" className="button secondary small" onClick={() => { setText(now); setRule(''); setNote(''); setEditing(true); }}>
            Edit<span className="visually-hidden"> paragraph {p.tag}</span>
          </button>
        )}
      </div>
      {edited ? (
        <div className="side-by-side">
          <div><p className="muted">Model text</p><p className="pre">{p.text}</p></div>
          <div><p className="muted">Edited text</p><p className="pre">{now}</p></div>
        </div>
      ) : <p className="pre">{p.text}</p>}
      {editing && (
        <form className="edit-form" onSubmit={(e) => {
          e.preventDefault();
          update(12, (d) => {
            d.provoke.stage2!.edits.push({ tag: p.tag, before: now, after: text, rule, note: note.trim(), at: new Date().toISOString() });
          }, 'none');
          setEditing(false);
        }}>
          <TextArea label={`Edited text of [${p.tag}]`} rows={8} value={text} onChange={setText} />
          <Select label="Rule (required)" value={rule} onChange={setRule}
            options={[{ value: '', label: 'Choose a rule' }, ...EDIT_RULES.map((r) => ({ value: r, label: r }))]} />
          <TextField label="Note (required)" value={note} onChange={setNote} />
          <div className="row-actions">
            <button type="submit" className="button primary" disabled={!rule || !note.trim() || text === now}>Save the edit</button>
            <button type="button" className="button secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function MdTableView({ t, caption }: { t: MdTable; caption: string }) {
  return (
    <div className="table-scroll">
      <table className="data">
        <caption>{caption}</caption>
        <thead><tr>{t.header.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
        <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

function PathsCalculator({ tableB }: { tableB: MdTable }) {
  const { run, update, editable } = useRun();
  const stored = run.provoke.stage2?.paths;
  const labels = tableB.rows.map((r) => r[0]);
  const [rows, setRows] = useState({ xMed: stored?.xMed ?? labels[0] ?? '', xY: stored?.xY ?? labels[1] ?? '', medY: stored?.medY ?? labels[2] ?? '' });
  const result = impliedPaths(tableB, rows);
  const choose = (k: keyof typeof rows) => (v: string) => {
    const next = { ...rows, [k]: v };
    setRows(next);
    if (editable) update(12, (d) => { d.provoke.stage2!.paths = impliedPaths(tableB, next); }, 'none');
  };
  const opts = labels.map((l) => ({ value: l, label: l }));
  return (
    <section aria-labelledby="paths-h">
      <h3 id="paths-h">Implied paths</h3>
      <p>Choose the rows of Table B that hold X–Med, X–Y and Med–Y.</p>
      <div className="grid-3">
        <Select label="X–Med" value={rows.xMed} onChange={choose('xMed')} options={opts} />
        <Select label="X–Y" value={rows.xY} onChange={choose('xY')} options={opts} />
        <Select label="Med–Y" value={rows.medY} onChange={choose('medY')} options={opts} />
      </div>
      {editable && !stored && (
        <button type="button" className="button secondary small" onClick={() => update(12, (d) => { d.provoke.stage2!.paths = result; }, 'none')}>
          Record these paths in the protocol
        </button>
      )}
      {result.columns.length > 0 ? (
        <div className="table-scroll">
          <table className="data">
            <caption>Implied paths per column of Table B</caption>
            <thead><tr><th scope="col">Path</th>{result.columns.map((c) => <th key={c.label} scope="col">{c.label}</th>)}</tr></thead>
            <tbody>
              {([['X → Med', 'xToMed'], ['Direct X → Y', 'direct'], ['Med → Y', 'medToY'], ['Indirect', 'indirect'], ['Share of the indirect path', 'share']] as const).map(([label, k]) => (
                <tr key={k}><th scope="row">{label}</th>{result.columns.map((c) => <td key={c.label}>{fmtCoef(c[k])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">The chosen rows do not hold three coefficients in any column.</p>}
      <p className="help">With a = r(X,Med), c = r(X,Y) and b0 = r(Med,Y): direct = (c − a·b0)/(1 − a²); Med → Y = (b0 − a·c)/(1 − a²); indirect = a × (Med → Y); share = indirect/(indirect + direct).</p>
    </section>
  );
}

export function Step12Edit() {
  const { run } = useRun();
  const { hash } = useLocation();
  const s2 = run.provoke.stage2;
  const kept = s2?.drafts.find((d) => d.status === 'kept');
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash]);
  if (!kept?.replyText) {
    return <StepFrame step={12}><p className="muted">Keep a draft in step 11 first.</p></StepFrame>;
  }
  const parts = splitStage2(kept.replyText);
  const tables = parseSyntheticTables(parts.part2);
  const edits = s2?.edits ?? [];
  return (
    <StepFrame step={12}>
      <p><strong>{edits.length}</strong> edit{edits.length === 1 ? '' : 's'} recorded.</p>
      {parts.accounts.map((a, i) => (
        <section key={i} className="account" aria-label={`Account ${i + 1}`}>
          <h2>{a.heading}</h2>
          {a.paragraphs.map((p) => <ParagraphView key={p.tag} p={p} />)}
        </section>
      ))}
      <section aria-labelledby="log-h">
        <h2 id="log-h">Edit log</h2>
        {s2?.editsNote && <p>{s2.editsNote}</p>}
        {edits.length === 0 ? <p className="muted">No edits yet.</p> : (
          <div className="table-scroll">
            <table className="data">
              <thead><tr><th scope="col">Tag</th><th scope="col">Rule</th><th scope="col">Note</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Time</th></tr></thead>
              <tbody>{edits.map((e, i) => (
                <tr key={i}><td>{e.tag}</td><td>{e.rule}</td><td>{e.note}</td><td>{e.before}</td><td>{e.after}</td><td>{fmtDateTime(e.at)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      <section aria-labelledby="tables-h">
        <h2 id="tables-h">Synthetic tables</h2>
        {(['A', 'B', 'C'] as const).map((k) => (tables[k] ? <MdTableView key={k} t={tables[k]!} caption={`Table ${k}`} /> : <p key={k} className="muted">Table {k} was not found.</p>))}
        {tables.B && <PathsCalculator tableB={tables.B} />}
      </section>
    </StepFrame>
  );
}
