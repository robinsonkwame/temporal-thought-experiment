import { useId, useState } from 'react';

/** A large text area for the model's reply and a button that hands it to the parser. */
export function PasteBack({ onUse, disabled }: { onUse: (text: string) => void; disabled?: boolean }) {
  const id = useId();
  const [text, setText] = useState('');
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
