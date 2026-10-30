import { useEffect, useState } from 'react';
import { StepFrame } from '../components/StepFrame';
import { PromptBox } from '../components/PromptBox';
import { PasteBack } from '../components/PasteBack';
import { Banner } from '../components/Banner';
import { TextArea } from '../components/Fields';
import { useRun, addLog } from '../components/RunContext';
import type { Run } from '../lib/types';
import { assembleStage1Prompt } from '../lib/assemble';
import { parseStage1, STAGE1_LABELS } from '../lib/parse';
import { copyOne, pasteOne, promptChanged } from '../lib/exchange';
import { fmtDateTime } from '../lib/text';
import { expectedReply, useDebugAction, EXPECTED_CHOICE } from '../lib/debug';

type S1 = NonNullable<Run['provoke']['stage1']>;

export function NeedsBlock() {
  return <Banner kind="warn">Confirm the slot values in step 9 first. Until then the prompt holds no slot values.</Banner>;
}

export function Step10Stage1() {
  const { run, update, editable } = useRun();
  const prompt = assembleStage1Prompt(run);
  const s1 = run.provoke.stage1;
  const [pick, setPick] = useState<number | undefined>(s1?.chosen);
  const [reason, setReason] = useState(s1?.reason ?? '');
  useEffect(() => { setPick(s1?.chosen); setReason(s1?.reason ?? ''); }, [s1?.chosen, s1?.reason]);
  const set = (fn: (s: S1, d: Run) => void, kind: 'none' | 'choose' = 'none') =>
    update(10, (d) => { d.provoke.stage1 ??= { exchange: { promptText: '' }, settings: [] }; fn(d.provoke.stage1, d); }, kind);
  useDebugAction('choice', editable && s1?.settings.some((s) => s.number === EXPECTED_CHOICE.number)
    ? `Choose setting ${EXPECTED_CHOICE.number} with the reason of the paper’s run` : null,
    () => { setPick(EXPECTED_CHOICE.number); setReason(EXPECTED_CHOICE.reason); });
  const warnings = s1?.exchange.replyText ? parseStage1(s1.exchange.replyText, run.templateVersion).warnings : [];

  function usePaste(text: string) {
    if (s1?.exchange.replyText && !window.confirm('Replace the reply? The earlier reply is kept in the log of this run.')) return;
    set((s, d) => {
      if (s.exchange.replyText) addLog(d, 10, 'Reply to prompt 2 replaced', s.exchange.replyText);
      s.exchange = pasteOne(s.exchange.promptText ? s.exchange : undefined, prompt, text);
      s.settings = parseStage1(text, d.templateVersion).settings;
    }, s1?.chosen !== undefined ? 'choose' : 'none');
  }

  return (
    <StepFrame step={10}>
      {!run.provoke.slot?.confirmedBlock && <NeedsBlock />}
      {s1?.exchange.source && <p className="muted">Prompt as sent: {s1.exchange.source}. The prompt below is regenerated from the confirmed block.</p>}
      {promptChanged(s1?.exchange, prompt) && <Banner kind="warn">The prompt changed after you copied it. Copy it again before you run it.</Banner>}
      <PromptBox label="Prompt 2: stage 1" text={prompt} copiedAt={s1?.exchange.copiedAt}
        onCopied={editable ? () => set((s) => { s.exchange = copyOne(s.exchange.promptText ? s.exchange : undefined, prompt); }) : undefined} />
      {editable && <PasteBack onUse={usePaste} expected={expectedReply(10, run)} />}
      {warnings.length > 0 && <Banner kind="warn">{warnings.map((w, i) => <p key={i}>{w}</p>)}</Banner>}

      {s1 && s1.settings.length > 0 && (
        <section aria-labelledby="settings-h">
          <h2 id="settings-h">Settings</h2>
          {s1.settings.map((st) => (
            <article key={st.number} className={`card setting ${s1.chosen === st.number ? 'is-chosen' : ''}`} aria-label={`Setting ${st.number}`}>
              <div className="card-head">
                <h3>Setting {st.number}</h3>
                {s1.chosen === st.number && <span className="badge">chosen</span>}
              </div>
              <p className="setting-text">{st.fields.Setting}</p>
              <dl className="fields">
                {STAGE1_LABELS.filter((l) => st.fields[l] !== undefined).map((l) => (
                  <div key={l} className="contents"><dt>{l}</dt><dd>{st.fields[l]}</dd></div>
                ))}
              </dl>
              <label className="check selected-check">
                <input type="radio" name="setting" checked={pick === st.number} disabled={!editable} onChange={() => setPick(st.number)} />
                <span>Choose setting {st.number}</span>
              </label>
            </article>
          ))}
          <p>Choose one setting for any reason, and write down why.</p>
          <fieldset className="plain" disabled={!editable}>
            <TextArea label="Reason (required)" rows={3} value={reason} onChange={setReason} />
            {editable && (
              <button type="button" className="button primary" disabled={pick === undefined || !reason.trim()}
                onClick={() => set((s, d) => {
                  if (s.chosen !== undefined && s.chosen !== pick) addLog(d, 10, 'Chosen setting changed', `from ${s.chosen} to ${pick}`);
                  s.chosen = pick; s.reason = reason.trim(); s.chosenAt = new Date().toISOString();
                }, s1.chosen !== undefined && s1.chosen !== pick ? 'choose' : 'none')}>
                Use this setting
              </button>
            )}
          </fieldset>
          {s1.chosen !== undefined && (
            <p className="muted">Setting {s1.chosen} chosen {fmtDateTime(s1.chosenAt)}. Reason: {s1.reason}</p>
          )}
        </section>
      )}
    </StepFrame>
  );
}
