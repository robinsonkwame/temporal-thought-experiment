import { useId, useState } from 'react';
import { useDebugAction, type Expected } from '../lib/debug';

/** A large text area for the model's reply and a button that hands it to the parser. */
export function PasteBack({ onUse, disabled, expected }: { onUse: (text: string) => void; disabled?: boolean; expected?: Expected | null }) {
  const id = useId();
  const [text, setText] = useState('');
  useDebugAction('paste', expected ? `Fill the reply box with ${expected.label}` : null, () => setText(expected?.text ?? ''));
  return (
    <section className="paste-back">
      <label htmlFor={id}>Paste the model's whole reply here</label>
      <textarea id={id} className="mono" rows={10} value={text} disabled={disabled} onChange={(e) => setText(e.target.value)} />
      <button type="button" className="button primary" disabled={disabled || !text.trim()} onClick={() => { onUse(text); setText(''); }}>
        Use this reply
      </button>
    </section>
  );
}
