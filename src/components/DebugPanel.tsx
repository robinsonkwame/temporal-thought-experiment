import { useEffect, useState } from 'react';
import { useDebugActions } from '../lib/debug';

/**
 * A small panel in the corner, shown only in debug mode. Alt+Shift+D hides or shows it, so that
 * screenshots stay clean; Alt+Shift+P runs the first fill action without the panel.
 */
export function DebugPanel() {
  const actions = useDebugActions();
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey) return;
      if (e.code === 'KeyD') { e.preventDefault(); setShown((s) => !s); }
      if (e.code === 'KeyP' && actions[0]) { e.preventDefault(); actions[0].run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);
  if (!shown) return null;
  return (
    <aside className="debug-panel" aria-label="Debug">
      <p><strong>Debug</strong> <span className="muted">Alt+Shift+D hides this panel. Alt+Shift+P runs the first fill.</span></p>
      {actions.length === 0 ? <p className="muted">Nothing to fill on this step.</p> : actions.map((a) => (
        <button key={a.id} type="button" className="button secondary small" onClick={a.run}>{a.label}</button>
      ))}
      <button type="button" className="link-button" onClick={() => setShown(false)}>Hide</button>
    </aside>
  );
}
