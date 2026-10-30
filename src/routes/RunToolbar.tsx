import type { ReactNode } from 'react';
import { useRun } from '../components/RunContext';
import { copyText, download } from '../components/announce';
import { shareLink } from '../lib/store';
import { buildProtocol } from '../lib/protocol';

export function fileStem(title: string): string {
  return (title || 'run').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'run';
}

export function ExportButtons({ primary }: { primary?: boolean }) {
  const { run, doc, id, mode } = useRun();
  const cls = primary ? 'button primary' : 'button secondary small';
  return (
    <div className="export-buttons">
      <button type="button" className={cls} onClick={() => download(`${fileStem(run.title)}-protocol.md`, buildProtocol(run), 'text/markdown;charset=utf-8')}>
        Download protocol (Markdown)
      </button>
      <button type="button" className={primary ? 'button secondary' : cls} onClick={() => download(`${fileStem(run.title)}.json`, `${JSON.stringify(doc, null, 2)}\n`, 'application/json')}>
        Download run (JSON)
      </button>
      {id && mode !== 'example' && (
        <button type="button" className={primary ? 'button secondary' : cls} onClick={() => copyText(shareLink(id))}>Copy share link</button>
      )}
    </div>
  );
}

export function RunToolbar({ status }: { status?: ReactNode }) {
  const { run } = useRun();
  return (
    <div className="run-toolbar">
      <div className="run-title">
        <p className="run-name">{run.title || 'Untitled run'}</p>
        <p className="muted">Prompt version {run.templateVersion}{status ? <> · {status}</> : null}</p>
      </div>
      <ExportButtons />
    </div>
  );
}
