import { describe, it, expect } from 'vitest';
import { recordCopy, recordPaste, copyOne, pasteOne, promptChanged } from '../src/lib/exchange';
import type { Exchange } from '../src/lib/types';

const id = (e: Exchange) => e;

describe('exchanges', () => {
  it('keeps the first copy time of a pending prompt', () => {
    let l = recordCopy([], 'P', id, 't1');
    l = recordCopy(l, 'P', id, 't2');
    expect(l).toEqual([{ promptText: 'P', copiedAt: 't1' }]);
    l = recordCopy(l, 'P2', id, 't3');
    expect(l).toEqual([{ promptText: 'P2', copiedAt: 't3' }]);
  });
  it('fills the pending exchange with the reply, then starts a new one', () => {
    let l = recordCopy([], 'P', id, 't1');
    l = recordPaste(l, 'P', 'R', id, 't2');
    expect(l).toEqual([{ promptText: 'P', copiedAt: 't1', replyText: 'R', pastedAt: 't2' }]);
    l = recordCopy(l, 'P', id, 't3');
    l = recordPaste(l, 'P', 'R2', id, 't4');
    expect(l.length).toBe(2);
    expect(l[1]).toEqual({ promptText: 'P', copiedAt: 't3', replyText: 'R2', pastedAt: 't4' });
    expect(recordPaste(l, 'P', 'R3', id, 't5')[2]).toEqual({ promptText: 'P', replyText: 'R3', pastedAt: 't5' });
  });
  it('handles a single exchange', () => {
    const e = copyOne(undefined, 'P', 't1');
    expect(copyOne(e, 'P', 't2')).toBe(e);
    const r = pasteOne(e, 'P', 'R', 't3');
    expect(r).toEqual({ promptText: 'P', copiedAt: 't1', replyText: 'R', pastedAt: 't3' });
    expect(pasteOne(r, 'P', 'R2', 't4')).toEqual({ promptText: 'P', copiedAt: 't1', replyText: 'R2', pastedAt: 't4' });
    expect(promptChanged(e, 'P')).toBe(false);
    expect(promptChanged(e, 'Q')).toBe(true);
  });
});
