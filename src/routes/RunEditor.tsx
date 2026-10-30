import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Run } from '../lib/types';
import { zRun } from '../lib/schema';
import { markStale, type ChangeKind } from '../lib/deps';
import { withDerived } from '../lib/derive';
import { newRun, copyRun } from '../lib/run';
import { createRun, loadRun, saveRun, ApiError } from '../lib/store';
import { rememberRun, tokenFor, touchRun } from '../lib/cookie';
import { fmtTime } from '../lib/text';
import { Banner } from '../components/Banner';
import { RunView } from './RunView';

type Save = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: string } | { kind: 'error' };

export const LOAD_ERROR = 'This run could not be loaded. Check the link, or it may have been deleted.';

export function RunEditor() {
  const { id: param = 'new', step = '0' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState<Run | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [save, setSave] = useState<Save>({ kind: 'idle' });
  const [copying, setCopying] = useState(false);

  const runRef = useRef<Run | null>(null);
  const idRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const version = useRef(0); // bumped on every change
  const savedVersion = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef(false);
  const backoff = useRef(0);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Load the run, unless it is the one this editor just created.
  useEffect(() => {
    if (param !== 'new' && param === idRef.current && runRef.current) return;
    setLoadError(false);
    if (param === 'new') {
      const seed = (location.state as { run?: unknown } | null)?.run;
      const r = seed ? zRun.parse(seed) : newRun();
      runRef.current = r; idRef.current = null; tokenRef.current = null;
      version.current = 0; savedVersion.current = 0;
      setRun(r);
      return;
    }
    let cancelled = false;
    setRun(null);
    loadRun(param).then(({ run: r }) => {
      if (cancelled) return;
      runRef.current = r; idRef.current = param; tokenRef.current = tokenFor(param) ?? null;
      version.current = 0; savedVersion.current = 0;
      setSave({ kind: 'idle' });
      setRun(r);
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (inflight.current || !runRef.current || version.current === savedVersion.current) return;
    inflight.current = true;
    const v = version.current;
    const doc = runRef.current;
    setSave({ kind: 'saving' });
    try {
      if (!idRef.current) {
        const { id, editToken } = await createRun(doc);
        idRef.current = id; tokenRef.current = editToken;
        rememberRun({ id, token: editToken, title: doc.title || 'Untitled run', updatedAt: new Date().toISOString() });
        navigate(`/run/${id}/${stepRef.current}`, { replace: true });
      } else {
        const { updatedAt } = await saveRun(idRef.current, tokenRef.current ?? '', doc);
        touchRun(idRef.current, doc.title || 'Untitled run', updatedAt);
      }
      savedVersion.current = v;
      backoff.current = 0;
      setSave({ kind: 'saved', at: new Date().toISOString() });
    } catch (e) {
      backoff.current = Math.min(60000, backoff.current ? backoff.current * 2 : 2000);
      setSave({ kind: 'error' });
      if (!(e instanceof ApiError && e.status === 403)) timer.current = window.setTimeout(flush, backoff.current);
    } finally {
      inflight.current = false;
      if (version.current !== savedVersion.current && backoff.current === 0) timer.current = window.setTimeout(flush, 1500);
    }
  }, [navigate]);

  // Save on page hide.
  useEffect(() => {
    const onHide = () => {
      if (!runRef.current || version.current === savedVersion.current) return;
      if (idRef.current && tokenRef.current) saveRun(idRef.current, tokenRef.current, runRef.current, true).catch(() => {});
      else flush();
    };
    const onVis = () => { if (document.visibilityState === 'hidden') onHide(); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onVis); };
  }, [flush]);

  const editable = param === 'new' || (!!tokenFor(param) && !run?.readOnlyExample) || (idRef.current === param && !!tokenRef.current);

  const update = useCallback((s: number, fn: (d: Run) => void, kind: ChangeKind = 'edit') => {
    const cur = runRef.current;
    if (!cur) return;
    const draft = structuredClone(cur);
    fn(draft);
    let next = markStale(draft, s, kind);
    next = { ...next, updatedAt: new Date().toISOString() };
    runRef.current = next;
    version.current++;
    setRun(next);
    // While a failed save waits for its retry, the retry carries this change too.
    if (backoff.current === 0) {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 1500);
    }
  }, [flush]);

  const shown = useMemo(() => (run ? withDerived(run) : null), [run]);

  if (loadError) return <div className="page"><Banner kind="error">{LOAD_ERROR}</Banner></div>;
  if (!run || !shown) return <div className="page"><p className="muted" role="status">Loading the run…</p></div>;

  const mode = param === 'new' ? 'new' : editable ? 'owned' : 'shared';
  const status = mode === 'shared' ? 'Read-only'
    : save.kind === 'saving' ? 'Saving…'
    : save.kind === 'error' ? 'Not saved: retrying'
    : save.kind === 'saved' ? `Saved ${fmtTime(save.at)}`
    : mode === 'new' ? 'Not saved yet: the run is saved on its first change' : 'Saved';

  async function makeCopy() {
    if (!run) return;
    setCopying(true);
    try {
      const copy = copyRun(run);
      const { id, editToken } = await createRun(copy);
      rememberRun({ id, token: editToken, title: copy.title, updatedAt: copy.updatedAt });
      idRef.current = null; runRef.current = null;
      navigate(`/run/${id}/${step}`);
    } catch {
      setSave({ kind: 'error' });
    } finally {
      setCopying(false);
    }
  }

  const banner = mode === 'shared' ? (
    <Banner>
      You are viewing a shared run. Make a copy to work on it.{' '}
      <button type="button" className="button primary small" disabled={copying} onClick={makeCopy}>Make a copy</button>
    </Banner>
  ) : run.notes?.length ? <Banner>{run.notes.map((n, i) => <p key={i}>{n}</p>)}</Banner> : undefined;

  return (
    <RunView
      ctx={{ run: shown, doc: run, editable, mode, base: `/run/${idRef.current ?? param}`, id: idRef.current ?? (param === 'new' ? undefined : param), update }}
      banner={banner}
      status={<span role="status">{status}</span>}
    />
  );
}
