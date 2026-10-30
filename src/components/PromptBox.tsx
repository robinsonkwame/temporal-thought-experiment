import { useId } from 'react';
import { promptWordCount } from '../lib/assemble';
import { copyText } from './announce';

/** The assembled prompt, read-only, with its word count and a large Copy button. */
export function PromptBox({ text, onCopied, label = 'The prompt', copiedAt }: {
  text: string; onCopied?: () => void; label?: string; copiedAt?: string;
}) {
  const id = useId();
  return (
    <section className="prompt-box" aria-labelledby={id}>
      <div className="prompt-head">
        <h2 id={id}>{label}</h2>
        <span className="muted">{promptWordCount(text).toLocaleString('en-GB')} words</span>
      </div>
      <textarea className="mono prompt-text" readOnly value={text} rows={12} aria-labelledby={id} />
      <div className="prompt-actions">
        <button type="button" className="button primary large" onClick={async () => { if (await copyText(text)) onCopied?.(); }}>
          Copy prompt
        </button>
        {copiedAt && <span className="muted">First copied {new Date(copiedAt).toLocaleString('en-GB')}</span>}
      </div>
      <p className="help">Open a new conversation in the Claude app, with the settings of step 8, and paste the prompt.</p>
    </section>
  );
}
