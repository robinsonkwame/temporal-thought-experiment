import { useId, useState } from 'react';
import type { Pick } from '../lib/types';
import { makePick, PickError, REPICK_REASONS, setAsideReason, currentPick, type PickKind } from '../lib/pick';
import { fmtTime } from '../lib/text';
import { announce } from './announce';

const NOUN: Record<PickKind, string> = { cell: 'Cell', conception: 'Conception', relationship: 'Relationship', change: 'Change' };

/** One pick panel of step 3: pick at random, pick again with a reason, or choose by hand with a reason. */
export function PickPanel({ kind, title, items, picks, onPick, editable, disabledNote }: {
  kind: PickKind; title: string; items: string[]; picks: Pick[]; onPick: (p: Pick) => void; editable: boolean; disabledNote?: string;
}) {
  const id = useId();
  const [mode, setMode] = useState<'idle' | 'again' | 'hand'>('idle');
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const [handReason, setHandReason] = useState('');
  const [chosen, setChosen] = useState(0);
  const [error, setError] = useState('');
  const mine = picks.filter((p) => p.kind === kind);
  const current = currentPick(picks, kind);
  const disabled = !editable || !!disabledNote || items.length === 0;

  function run(how: 'random' | 'by hand', why: string) {
    try {
      const p = makePick(picks, kind, items, { how, reason: why, chosen });
      onPick(p);
      announce(`${NOUN[kind]} ${p.index} of ${p.of}: ${p.value}`);
      setMode('idle'); setReason(''); setOther(''); setHandReason(''); setError('');
    } catch (e) {
      if (e instanceof PickError) setError(e.message); else throw e;
    }
  }

  const againReason = reason === 'Other' ? (other.trim() ? `Other: ${other.trim()}` : '') : reason;

  return (
    <section className="pick-panel" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {disabledNote && <p className="muted">{disabledNote}</p>}
      {!disabledNote && items.length > 0 && <p className="muted">{items.length} eligible.</p>}
      {current ? (
        <p className="pick-current"><strong>{NOUN[kind]} {current.index} of {current.of}:</strong> {current.value}</p>
      ) : (
        <p className="pick-current muted">No pick yet.</p>
      )}
      {editable && (
        <div className="pick-actions">
          {!current
            ? <button type="button" className="button primary" disabled={disabled} onClick={() => run('random', '')}>Pick at random</button>
            : <button type="button" className="button secondary" disabled={disabled} onClick={() => { setMode('again'); setError(''); }}>Pick again</button>}
          <button type="button" className="button secondary" disabled={disabled} onClick={() => { setMode('hand'); setError(''); }}>Choose by hand</button>
        </div>
      )}
      {mode === 'again' && (
        <form className="pick-form" onSubmit={(e) => { e.preventDefault(); run('random', againReason); }}>
          <div className="field">
            <label htmlFor={`${id}-r`}>Reason for setting the current pick aside</label>
            <select id={`${id}-r`} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason</option>
              {REPICK_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {reason === 'Other' && (
            <div className="field">
              <label htmlFor={`${id}-o`}>Other reason (required)</label>
              <input id={`${id}-o`} type="text" value={other} onChange={(e) => setOther(e.target.value)} />
            </div>
          )}
          <div className="row-actions">
            <button type="submit" className="button primary" disabled={!againReason}>Pick again at random</button>
            <button type="button" className="button secondary" onClick={() => setMode('idle')}>Cancel</button>
          </div>
        </form>
      )}
      {mode === 'hand' && (
        <form className="pick-form" onSubmit={(e) => { e.preventDefault(); run('by hand', handReason); }}>
          <div className="field">
            <label htmlFor={`${id}-i`}>{NOUN[kind]}</label>
            <select id={`${id}-i`} value={chosen} onChange={(e) => setChosen(Number(e.target.value))}>
              {items.map((it, i) => <option key={i} value={i}>{`${i + 1}. ${it}`}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${id}-h`}>Reason for choosing by hand (required)</label>
            <input id={`${id}-h`} type="text" value={handReason} onChange={(e) => setHandReason(e.target.value)} />
          </div>
          <div className="row-actions">
            <button type="submit" className="button primary" disabled={!handReason.trim()}>Use this {NOUN[kind].toLowerCase()}</button>
            <button type="button" className="button secondary" onClick={() => setMode('idle')}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
      {mine.length > 0 && (
        <ol className="pick-history" aria-label={`History of ${title.toLowerCase()} picks`}>
          {mine.map((p, i) => {
            const aside = setAsideReason(p, picks);
            return (
              <li key={i}>
                Pick {i + 1}, {fmtTime(p.at)}: {p.value}.{p.how === 'by hand' ? ` Chosen by hand: ${p.reason}.` : ''}
                {aside !== null ? ` Set aside: ${aside}.` : ''}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
