import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import exampleJson from '../content/example_utaut2.json';
import { zRun } from '../lib/schema';
import type { Run, TemplateVersion } from '../lib/types';
import { withDerived } from '../lib/derive';
import { copyExample } from '../lib/run';
import { createRun } from '../lib/store';
import { rememberRun } from '../lib/cookie';
import { Banner } from '../components/Banner';
import { Radios } from '../components/Fields';
import { RunView } from './RunView';

export const EXAMPLE: Run = zRun.parse(exampleJson);

export function Example() {
  const navigate = useNavigate();
  const { step = '0' } = useParams();
  const shown = useMemo(() => withDerived(EXAMPLE), []);
  const [asking, setAsking] = useState(false);
  const [version, setVersion] = useState<TemplateVersion>('2.5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function copy() {
    setBusy(true); setError('');
    try {
      const run = copyExample(EXAMPLE, version);
      const { id, editToken } = await createRun(run);
      rememberRun({ id, token: editToken, title: run.title, updatedAt: run.updatedAt });
      navigate(`/run/${id}/${step}`);
    } catch {
      setError('The copy could not be saved. Try again.');
      setBusy(false);
    }
  }

  const banner = (
    <Banner>
      <p>This is the worked run from the paper (prompt version 2.4). Make a copy to explore it, or to run Provoke again with version 2.5.</p>
      {EXAMPLE.notes?.length ? (
        <details>
          <summary>Notes on the example</summary>
          {EXAMPLE.notes.map((n, i) => <p key={i} className="muted">{n}</p>)}
        </details>
      ) : null}
      {!asking ? (
        <button type="button" className="button primary small" onClick={() => setAsking(true)}>Make a copy</button>
      ) : (
        <form className="copy-form" onSubmit={(e) => { e.preventDefault(); copy(); }}>
          <p>The copy keeps the tables and drops the Provoke replies.</p>
          <Radios<TemplateVersion> legend="Prompt version for the copy" name="copy-version" value={version} inline
            options={[{ value: '2.5', label: '2.5 (default)' }, { value: '2.4', label: '2.4, the version of the paper’s run' }]}
            onChange={setVersion} />
          <div className="row-actions">
            <button type="submit" className="button primary" disabled={busy}>Make the copy</button>
            <button type="button" className="button secondary" onClick={() => setAsking(false)}>Cancel</button>
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
        </form>
      )}
    </Banner>
  );

  return (
    <RunView
      ctx={{ run: shown, doc: EXAMPLE, editable: false, mode: 'example', base: '/example/utaut2', update: () => {} }}
      banner={banner}
      status={<span>Read-only example</span>}
    />
  );
}
