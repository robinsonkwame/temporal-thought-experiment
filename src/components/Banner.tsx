import type { ReactNode } from 'react';

export function Banner({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'error'; children: ReactNode }) {
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind !== 'info' && <strong className="banner-label">{kind === 'warn' ? 'Note: ' : 'Problem: '}</strong>}
      {children}
    </div>
  );
}
