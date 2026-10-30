import { useEffect, useId, useState } from 'react';
import { StepFrame, FindingList } from '../components/StepFrame';
import { PromptBox } from '../components/PromptBox';
import { PasteBack } from '../components/PasteBack';
import { Banner } from '../components/Banner';
import { useRun, addLog } from '../components/RunContext';
import type { Run } from '../lib/types';
import { slotsFor } from '../lib/types';
import { assembleSlotPrompt } from '../lib/assemble';
import { tableCheck } from '../lib/checks';
import { parseSlotReply } from '../lib/parse';
import { serializeBlock } from '../lib/block';
import { recordCopy, recordPaste, promptChanged } from '../lib/exchange';
import { normWs, fmtDateTime } from '../lib/text';
import { expectedReply } from '../lib/debug';

type Slot = NonNullable<Run['provoke']['slot']>;

const emptySlot = (): Slot => ({ attempts: [], status: 'incomplete', parsed: {}, sources: {}, edits: [] });

/** The table value that a copied slot must equal. */
export function tableValueFor(run: Run, name: string): string | undefined {
  switch (name) {
    case 'R': return run.setup.b;
    case 'C_TEXT': return run.draw.cText;
    case 'R_PRIME': return run.setup.c;
    case 'M': return run.setup.d;
    case 'STYLE_MODEL': return run.templateVersion === '2.5' ? run.setup.n : undefined;
    default: return undefined;
  }
}

function badgeFor(value: string | undefined, source: string | undefined): { word: string; cls: string } {
  if (value === undefined || value.trim() === '') return { word: 'missing', cls: 'badge-error' };
  if (/^\s*copied/i.test(source ?? '')) return { word: 'copied', cls: '' };
  if (/^\s*derived/i.test(source ?? '')) return { word: 'derived', cls: '' };
  return { word: 'no source given', cls: 'badge-warn' };
}

function SlotField({ name, value, source, tableValue, locked, onCommit }: {
  name: string; value: string | undefined; source?: string; tableValue?: string; locked: boolean; onCommit: (v: string) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);
  const badge = badgeFor(value, source);
  const differs = tableValue !== undefined && value !== undefined && normWs(text) !== normWs(tableValue);
  return (
    <div className={`field slot-field ${badge.word === 'missing' ? 'is-missing' : ''}`}>
      <label htmlFor={id}>{name} <span className={`badge ${badge.cls}`}>{badge.word}</span></label>
      {source && <p className="help">Source: {source}</p>}
      <textarea id={id} rows={Math.min(8, Math.max(2, Math.ceil(text.length / 90) + (text.match(/\n/g)?.length ?? 0)))}
        value={text} readOnly={locked} onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text !== (value ?? '')) onCommit(text); }} />
      {differs && (
        <p className="cell-diff">This value differs from your table.<span className="muted"> Table: {tableValue}</span></p>
      )}
    </div>
  );
}

export function Step09Slot() {
  const { run, update, editable } = useRun();
  const [showRaw, setShowRaw] = useState(true);
  const prompt = assembleSlotPrompt(run);
  const slot = run.provoke.slot;
  const last = slot?.attempts[slot.attempts.length - 1];
  const findings = tableCheck(run);
  const blocking = findings.filter((f) => f.severity !== 'warning');
  const set = (fn: (s: Slot, d: Run) => void, kind: 'edit' | 'confirm' | 'none' = 'none') =>
    update(9, (d) => { d.provoke.slot ??= emptySlot(); fn(d.provoke.slot, d); }, kind);

  const lastReply = [...(slot?.attempts ?? [])].reverse().find((a) => a.replyText !== undefined);
  const parse = lastReply?.replyText ? parseSlotReply(lastReply.replyText, run.templateVersion) : null;
  const locked = !editable || slot?.status === 'confirmed';
  const names = slotsFor(run.templateVersion);

  function usePaste(text: string) {
    const r = parseSlotReply(text, run.templateVersion);
    set((s, d) => {
      s.attempts = recordPaste(s.attempts, prompt, text, (e) => e);
      if (r.status === 'incomplete') { if (s.status !== 'confirmed') s.status = 'incomplete'; return; }
      if (s.status === 'confirmed') addLog(d, 9, 'Slot values unlocked by a new reply');
      s.status = 'parsed';
      s.parsed = r.slots;
      s.sources = r.sources;
    });
  }

  return (
    <StepFrame step={9} showFindings={false}>
      <h2>Table check</h2>
      {findings.length === 0 ? <p>The tables pass the check.</p> : (
        <>
          <FindingList findings={findings} linkSteps />
          {blocking.length > 0 && <p>You may copy the prompt anyway. The model will report these gaps too.</p>}
        </>
      )}

      {last?.source && <p className="muted">Prompt as sent: {last.source}. The prompt below is regenerated from the tables.</p>}
      {promptChanged(last, prompt) && last?.replyText === undefined && (
        <Banner kind="warn">The tables changed after you copied the prompt. Copy it again before you run it.</Banner>
      )}
      <PromptBox label="Prompt 1: the slot prompt" text={prompt} copiedAt={last?.replyText === undefined ? last?.copiedAt : undefined}
        onCopied={editable ? () => set((s) => { s.attempts = recordCopy(s.attempts, prompt, (e) => e); }) : undefined} />
      {editable && <PasteBack onUse={usePaste} expected={expectedReply(9, run)} />}

      {slot && slot.attempts.length > 1 && (
        <p className="muted">{slot.attempts.length} attempts are kept in the protocol.</p>
      )}

      {parse?.status === 'incomplete' && (
        <section className="card">
          <h2>INPUTS INCOMPLETE</h2>
          <p>Fill in the tables and copy the prompt again.</p>
          <div className="raw">{parse.text}</div>
        </section>
      )}

      {slot && Object.keys(slot.parsed).length > 0 && (
        <section aria-labelledby="slots-h">
          <div className="card-head">
            <h2 id="slots-h">Slot values</h2>
            <span className="badge">{slot.status === 'confirmed' ? `confirmed ${fmtDateTime(slot.confirmedAt)}` : 'not confirmed'}</span>
            {lastReply?.replyText && (
              <button type="button" className="button secondary small" aria-expanded={showRaw} onClick={() => setShowRaw(!showRaw)}>
                {showRaw ? 'Hide the raw reply' : 'Show the raw reply'}
              </button>
            )}
          </div>
          {parse?.status === 'parsed' && (parse.missing.length > 0 || parse.unknown.length > 0 || parse.duplicates.length > 0 || !parse.found) && (
            <Banner kind="warn">
              {!parse.found && <p>The reply has no line SLOT VALUES.</p>}
              {parse.missing.length > 0 && <p>Missing slots: {parse.missing.join(', ')}.</p>}
              {parse.unknown.length > 0 && <p>Unknown names: {parse.unknown.join(', ')}.</p>}
              {parse.duplicates.length > 0 && <p>Names given twice: {parse.duplicates.join(', ')}.</p>}
            </Banner>
          )}
          <div className={showRaw && lastReply?.replyText ? 'slot-layout' : ''}>
            <div>
              {names.map((n) => (
                <SlotField key={n} name={n} value={slot.parsed[n]} source={slot.sources[n] ?? (parse?.status === 'parsed' ? parse.sources[n] : undefined)} tableValue={tableValueFor(run, n)} locked={locked}
                  onCommit={(v) => set((s) => {
                    s.edits.push({ slot: n, before: s.parsed[n] ?? '', after: v, at: new Date().toISOString() });
                    s.parsed[n] = v;
                  })} />
              ))}
            </div>
            {showRaw && lastReply?.replyText && (
              <aside aria-label="The reply as received"><div className="raw sticky">{lastReply.replyText}</div></aside>
            )}
          </div>
          {slot.edits.length > 0 && <p className="muted">{slot.edits.length} edit{slot.edits.length > 1 ? 's' : ''} to the slot values are logged.</p>}
          {editable && (slot.status === 'confirmed' ? (
            <button type="button" className="button secondary" onClick={() => set((s, d) => { s.status = 'parsed'; addLog(d, 9, 'Unlocked the slot values to edit'); })}>
              Unlock to edit
            </button>
          ) : (
            <button type="button" className="button primary" onClick={() => {
              const block = serializeBlock(slot.parsed, run.templateVersion);
              const changed = !!slot.confirmedBlock && slot.confirmedBlock !== block;
              set((s) => { s.status = 'confirmed'; s.confirmedBlock = block; s.confirmedAt = new Date().toISOString(); }, changed ? 'confirm' : 'none');
            }}>Confirm the slot values</button>
          ))}
          {slot.confirmedBlock && (
            <details className="block-details">
              <summary>The confirmed block</summary>
              <div className="raw">{slot.confirmedBlock}</div>
            </details>
          )}
        </section>
      )}
    </StepFrame>
  );
}
