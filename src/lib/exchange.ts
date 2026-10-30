// Recording prompts as copied and replies as pasted.
import type { Exchange } from './types';

const now = () => new Date().toISOString();

/**
 * A copy of `prompt` in a list of exchanges. A pending exchange (no reply yet) with the same prompt keeps
 * its first copy time; a pending exchange with another prompt takes the new prompt; otherwise a new
 * exchange starts. Returns the list and the changed exchange.
 */
export function recordCopy<T extends Exchange>(list: T[], prompt: string, make: (e: Exchange) => T, at = now()): T[] {
  const last = list[list.length - 1];
  if (last && last.replyText === undefined) {
    if (last.promptText === prompt && last.copiedAt) return list;
    return [...list.slice(0, -1), { ...last, promptText: prompt, copiedAt: at }];
  }
  return [...list, make({ promptText: prompt, copiedAt: at })];
}

/** A pasted reply fills the pending exchange, or starts a new one with the current prompt. */
export function recordPaste<T extends Exchange>(list: T[], prompt: string, reply: string, make: (e: Exchange) => T, at = now()): T[] {
  const last = list[list.length - 1];
  if (last && last.replyText === undefined) return [...list.slice(0, -1), { ...last, replyText: reply, pastedAt: at }];
  return [...list, make({ promptText: prompt, replyText: reply, pastedAt: at })];
}

/** For a step with a single exchange: the first copy is kept until a reply arrives. */
export function copyOne(e: Exchange | undefined, prompt: string, at = now()): Exchange {
  if (e && e.replyText === undefined && e.promptText === prompt && e.copiedAt) return e;
  if (e && e.replyText !== undefined) return e;
  return { promptText: prompt, copiedAt: at };
}

export function pasteOne(e: Exchange | undefined, prompt: string, reply: string, at = now()): Exchange {
  if (e && e.replyText === undefined) return { ...e, replyText: reply, pastedAt: at };
  return { promptText: prompt, replyText: reply, pastedAt: at, ...(e?.copiedAt && e.promptText === prompt ? { copiedAt: e.copiedAt } : {}) };
}

/** The prompt was copied, and the prompt the tables give now differs from it. */
export function promptChanged(e: Exchange | undefined, current: string): boolean {
  return !!e && !!e.copiedAt && !!e.promptText && e.promptText !== current;
}
