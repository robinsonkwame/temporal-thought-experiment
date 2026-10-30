import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgetRun, myRuns, rememberRun, type RunRef } from '../lib/cookie';
import { createRun, deleteRun, shareLink, ApiError } from '../lib/store';
import { zRun } from '../lib/schema';
import { copyText } from '../components/announce';
import { Banner } from '../components/Banner';

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function Home() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunRef[]>(() => myRuns());
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => setRuns(myRuns());
  const sorted = [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  async function remove(r: RunRef) {
    if (!window.confirm('Delete this run for everyone who has the link? This cannot be undone.')) return;
    try {
      await deleteRun(r.id, r.token);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) { setError(`The run could not be deleted: ${(e as Error).message}`); return; }
    }
    forgetRun(r.id);
    refresh();
  }

  async function importFile(file: File) {
    setError('');
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setError('The file is not JSON.');
      return;
    }
    const parsed = zRun.safeParse(data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`The file is not a run: ${issue.path.join('.') || 'run'}: ${issue.message}`);
      return;
    }
    const run = { ...parsed.data, readOnlyExample: false, updatedAt: new Date().toISOString() };
    try {
      const { id, editToken } = await createRun(run);
      rememberRun({ id, token: editToken, title: run.title || 'Untitled run', updatedAt: run.updatedAt });
      navigate(`/run/${id}/0`);
    } catch (e) {
      setError(`The run could not be saved: ${(e as Error).message}`);
    }
  }

  return (
    <div className="page home">
      <h1>Temporal thought experiment workbench</h1>
      <p className="lede">A guided record of one run of the method: Select, Explore, Transform and Provoke.</p>
      <div className="row-actions">
        <Link className="button primary" to="/run/new/0">Start a new run</Link>
        <Link className="button secondary" to="/example/utaut2/0">Open the worked example</Link>
        <button type="button" className="button secondary" onClick={() => fileRef.current?.click()}>Import run (JSON)</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} aria-hidden="true"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
      </div>
      {error && <Banner kind="error">{error}</Banner>}
      <h2>My runs</h2>
      {sorted.length === 0 ? (
        <p className="muted">No runs on this device yet.</p>
      ) : (
        <ul className="run-list">
          {sorted.map((r) => (
            <li key={r.id} className="run-item">
              <div>
                <Link to={`/run/${r.id}/0`} className="run-item-title">{r.title || 'Untitled run'}</Link>
                <p className="muted">Last saved {when(r.updatedAt)}</p>
              </div>
              <div className="row-actions" role="group" aria-label={`Actions for ${r.title || 'Untitled run'}`}>
                <Link className="button secondary small" to={`/run/${r.id}/0`}>Open</Link>
                <button type="button" className="button secondary small" onClick={() => copyText(shareLink(r.id))}>Copy share link</button>
                <button type="button" className="button secondary small" onClick={() => remove(r)}>Delete</button>
                <button type="button" className="button secondary small" onClick={() => { forgetRun(r.id); refresh(); }}>Forget on this device</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
