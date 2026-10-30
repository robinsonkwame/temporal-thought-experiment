import type { ReactNode } from 'react';

/** Rows with add, remove and reorder. Each row renders its own fields. */
export function TableEditor<T>({ rows, render, onAdd, onRemove, onMove, addLabel, rowLabel, className }: {
  rows: T[];
  render: (row: T, i: number) => ReactNode;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMove: (i: number, delta: -1 | 1) => void;
  addLabel: string;
  rowLabel: (row: T, i: number) => string;
  className?: string;
}) {
  return (
    <div className={`table-editor ${className ?? ''}`}>
      {rows.map((row, i) => (
        <div className="te-row" key={i}>
          <div className="te-fields">{render(row, i)}</div>
          <div className="te-actions" role="group" aria-label={`Row actions for ${rowLabel(row, i)}`}>
            <button type="button" className="button secondary small" onClick={() => onMove(i, -1)} disabled={i === 0}>Move up</button>
            <button type="button" className="button secondary small" onClick={() => onMove(i, 1)} disabled={i === rows.length - 1}>Move down</button>
            <button type="button" className="button secondary small" onClick={() => onRemove(i)}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className="button secondary" onClick={onAdd}>{addLabel}</button>
    </div>
  );
}

export function move<T>(list: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
