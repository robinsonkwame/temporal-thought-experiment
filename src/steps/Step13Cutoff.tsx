import { StepFrame } from '../components/StepFrame';
import { PromptBox } from '../components/PromptBox';
import { PasteBack } from '../components/PasteBack';
import { Banner } from '../components/Banner';
import { useRun, addLog } from '../components/RunContext';
import { assembleCutoffPrompt } from '../lib/assemble';
import { copyOne, pasteOne, promptChanged } from '../lib/exchange';
import { fmtDateTime } from '../lib/text';
import { NeedsBlock } from './Step10Stage1';
import { expectedReply } from '../lib/debug';

export function Step13Cutoff() {
  const { run, update, editable } = useRun();
  const prompt = assembleCutoffPrompt(run);
  const ex = run.provoke.cutoff?.exchange;
  return (
    <StepFrame step={13}>
      {!run.provoke.slot?.confirmedBlock && <NeedsBlock />}
      {ex?.source && <p className="muted">Prompt as sent: {ex.source}. The prompt below is regenerated from the confirmed block.</p>}
      {promptChanged(ex, prompt) && <Banner kind="warn">The prompt changed after you copied it. Copy it again before you run it.</Banner>}
      <PromptBox label="Prompt 4: cut-off check" text={prompt} copiedAt={ex?.copiedAt}
        onCopied={editable ? () => update(13, (d) => { d.provoke.cutoff = { exchange: copyOne(d.provoke.cutoff?.exchange, prompt) }; }, 'none') : undefined} />
      {editable && (
        <PasteBack expected={expectedReply(13, run)} onUse={(text) => {
          if (ex?.replyText && !window.confirm('Replace the reply? The earlier reply is kept in the log of this run.')) return;
          update(13, (d) => {
            if (d.provoke.cutoff?.exchange.replyText) addLog(d, 13, 'Reply to prompt 4 replaced', d.provoke.cutoff.exchange.replyText);
            d.provoke.cutoff = { exchange: pasteOne(d.provoke.cutoff?.exchange, prompt, text) };
          }, 'none');
        }} />
      )}
      {ex?.replyText && (
        <section>
          <h2>The reply as received</h2>
          <p className="muted">Pasted {fmtDateTime(ex.pastedAt)}.</p>
          <div className="raw">{ex.replyText}</div>
        </section>
      )}
    </StepFrame>
  );
}
