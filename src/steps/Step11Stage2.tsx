import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StepFrame } from '../components/StepFrame';
import { PromptBox } from '../components/PromptBox';
import { PasteBack } from '../components/PasteBack';
import { Banner } from '../components/Banner';
import { TextArea } from '../components/Fields';
import { useRun, addLog } from '../components/RunContext';
import type { Run, Draft } from '../lib/types';
import { assembleStage2Prompt, chosenSettingText } from '../lib/assemble';
import { checklistClauses } from '../lib/templates';
import { lintFor } from '../lib/checks';
import { lintFindings, openingsOf, WORD_RANGE, PARAGRAPH_RANGE } from '../lib/lint';
import { recordCopy, recordPaste } from '../lib/exchange';
import { runFromQuestion } from '../lib/run';
import { fmtDateTime } from '../lib/text';
import type { LintReport } from '../lib/types';

type S2 = NonNullable<Run['provoke']['stage2']>;
const emptyS2 = (): S2 => ({ drafts: [], edits: [] });
const asDraft = (e: Draft | { promptText: string }): Draft => ({ status: 'pending', ...e });

function LintView({ report }: { report: LintReport }) {
  const findings = lintFindings(report);
  return (
    <div className="lint">
      <h4>Lint report</h4>
      <div className="table-scroll">
        <table className="data">
          <thead><tr><th scope="col">Account</th><th scope="col">Title</th><th scope="col">Words</th><th scope="col">Paragraphs</th></tr></thead>
          <tbody>
            {report.accounts.map((a, i) => {
              const wOut = a.words < WORD_RANGE[0] || a.words > WORD_RANGE[1];
              const pOut = a.paragraphs < PARAGRAPH_RANGE[0] || a.paragraphs > PARAGRAPH_RANGE[1];
              return (
                <tr key={i}>
                  <td>{i + 1}</td><td>{a.title}</td>
                  <td>{a.words.toLocaleString('en-GB')}{wOut && <> <span className="badge badge-warn">outside 900 to 1,200</span></>}</td>
                  <td>{a.paragraphs}{pOut && <> <span className="badge badge-warn">outside 8 to 12</span></>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>Tables found: {report.tablesFound.length ? report.tablesFound.join(', ') : 'none'}. Closing sentence: {report.closingSentence ? 'found' : 'not found'}.</p>
      {findings.length === 0 ? <p>The lint found nothing to flag.</p> : (
        <>
          <p className="muted">The lint flags; it never rejects. Some words may be acceptable in plain use.</p>
          <ul className="lint-findings">{findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </>
      )}
    </div>
  );
}

function DraftCard({ draft, k, isLast }: { draft: Draft; k: number; isLast: boolean }) {
  const { run, update, editable } = useRun();
  const [discarding, setDiscarding] = useState(false);
  const [reason, setReason] = useState('');
  const { lead, clauses, tail } = checklistClauses(run.templateVersion);
  const report = draft.replyText ? draft.lint ?? lintFor(run, draft.replyText).report : null;
  const set = (fn: (s: S2, d: Run) => void) => update(11, (d) => { d.provoke.stage2 ??= emptyS2(); fn(d.provoke.stage2, d); }, 'none');
  const otherKept = run.provoke.stage2?.drafts.findIndex((d, i) => d.status === 'kept' && i !== k) ?? -1;

  return (
    <article className="card draft" aria-label={`Draft ${k + 1}`}>
      <div className="card-head">
        <h3>Draft {k + 1}</h3>
        <span className="badge">{draft.replyText === undefined ? 'waiting for the reply' : draft.status}</span>
        <span className="muted">
          {draft.copiedAt ? `Copied ${fmtDateTime(draft.copiedAt)}. ` : ''}{draft.pastedAt ? `Pasted ${fmtDateTime(draft.pastedAt)}.` : ''}
          {draft.source ? ` ${draft.source}.` : ''}
        </span>
      </div>
      {draft.status === 'discarded' && <p>Discarded. Reason: {draft.reason}</p>}
      {report && <LintView report={report} />}
      {draft.replyText !== undefined && (
        <fieldset className="checks checklist" disabled={!editable}>
          <legend>Check list</legend>
          <p className="help">{lead}</p>
          {clauses.map((c, i) => (
            <label key={i} className="check">
              <input type="checkbox" checked={!!draft.checklist?.[i]} onChange={(e) => set((s) => {
                const d = s.drafts[k];
                d.checklist = clauses.map((_, j) => (j === i ? e.target.checked : !!d.checklist?.[j]));
              })} />
              <span>{c}</span>
            </label>
          ))}
          <p className="help">{tail}</p>
        </fieldset>
      )}
      {editable && draft.replyText !== undefined && draft.status !== 'discarded' && (
        <div className="row-actions">
          {draft.status !== 'kept' && (
            <button type="button" className="button primary" onClick={() => set((s, d) => {
              if (otherKept >= 0) {
                s.drafts[otherKept].status = 'pending';
                addLog(d, 11, `Kept draft ${k + 1} in place of draft ${otherKept + 1}`);
              }
              s.drafts[k].status = 'kept';
              if (d.templateVersion === '2.5') s.openings = openingsOf(s.drafts[k].replyText ?? '');
            })}>{otherKept >= 0 ? 'Keep this draft instead' : 'Keep this draft'}</button>
          )}
          {!discarding && (
            <button type="button" className="button secondary" onClick={() => setDiscarding(true)}>Discard and generate again</button>
          )}
        </div>
      )}
      {discarding && (
        <form onSubmit={(e) => {
          e.preventDefault();
          set((s) => { s.drafts[k].status = 'discarded'; s.drafts[k].reason = reason.trim(); if (s.openings && draft.status === 'kept') s.openings = undefined; });
          setDiscarding(false);
        }}>
          <TextArea label="Reason for discarding (required)" rows={2} value={reason} onChange={setReason} />
          <div className="row-actions">
            <button type="submit" className="button primary" disabled={!reason.trim()}>Discard this draft</button>
            <button type="button" className="button secondary" onClick={() => setDiscarding(false)}>Cancel</button>
          </div>
        </form>
      )}
      {isLast && draft.status === 'discarded' && <p><strong>Open a new conversation and paste the same prompt again.</strong></p>}
      {draft.replyText && (
        <details>
          <summary>The reply as received</summary>
          <div className="raw">{draft.replyText}</div>
        </details>
      )}
    </article>
  );
}

export function Step11Stage2() {
  const { run, update, editable, base } = useRun();
  const navigate = useNavigate();
  const prompt = assembleStage2Prompt(run);
  const s2 = run.provoke.stage2;
  const drafts = s2?.drafts ?? [];
  const pending = drafts[drafts.length - 1];
  const set = (fn: (s: S2, d: Run) => void) => update(11, (d) => { d.provoke.stage2 ??= emptyS2(); fn(d.provoke.stage2, d); }, 'none');
  const openings = s2?.openings ?? [];

  return (
    <StepFrame step={11}>
      {!run.provoke.slot?.confirmedBlock && <Banner kind="warn">Confirm the slot values in step 9 first.</Banner>}
      {!chosenSettingText(run) && <Banner kind="warn">Choose a setting in step 10 first. Until then the prompt holds no setting.</Banner>}
      {pending && pending.replyText === undefined && pending.promptText !== prompt && (
        <Banner kind="warn">The prompt changed after you copied it. Copy it again before you run it.</Banner>
      )}
      <PromptBox label="Prompt 3: stage 2" text={prompt}
        copiedAt={pending && pending.replyText === undefined ? pending.copiedAt : undefined}
        onCopied={editable ? () => set((s) => { s.drafts = recordCopy(s.drafts, prompt, asDraft); }) : undefined} />
      {editable && (
        <PasteBack onUse={(text) => set((s, d) => {
          s.drafts = recordPaste(s.drafts, prompt, text, asDraft);
          const dr = s.drafts[s.drafts.length - 1];
          dr.lint = lintFor(d, text).report;
          dr.checklist = checklistClauses(d.templateVersion).clauses.map(() => false);
        })} />
      )}
      {drafts.length > 0 && <h2>Drafts</h2>}
      {drafts.map((d, k) => <DraftCard key={k} draft={d} k={k} isLast={k === drafts.length - 1} />)}

      {run.templateVersion === '2.5' && openings.length > 0 && (
        <section aria-labelledby="open-h">
          <h2 id="open-h">Openings for research</h2>
          <ol className="openings">
            {openings.map((o, i) => (
              <li key={i}>
                <Link to={`${base}/12#${o.tag}`}>[{o.tag}]</Link> {o.text}
                {o.otherDimension && (
                  <div>
                    <button type="button" className="button secondary small"
                      onClick={() => navigate('/run/new/0', { state: { run: runFromQuestion(run, `[${o.tag}] ${o.text}`) } })}>
                      Start a new run from this question
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </StepFrame>
  );
}
