// Parsers for the model's replies (brief, sections 8.2 and 8.3) and for Part 3 of stage 2.
import type { TemplateVersion, Stage1Setting } from './types';
import { slotsFor } from './types';
import { readNamedLines, BLOCK_START, BLOCK_END } from './block';

/** A line without Markdown bold markers, heading marks or surrounding space: for finding markers. */
export function clean(line: string): string {
  return line.replace(/\*\*|__/g, '').replace(/^\s*#+\s*/, '').trim();
}

const isFence = (l: string) => /^\s*(```|~~~)/.test(l);

export type SlotReply =
  | { status: 'incomplete'; text: string }
  | {
      status: 'parsed';
      found: boolean;
      slots: Record<string, string>;
      sources: Record<string, string>;
      missing: string[];
      empty: string[];
      unknown: string[];
      duplicates: string[];
    };

function section(lines: string[], start: string, end: string): string[] | null {
  const s = lines.findIndex((l) => clean(l) === start);
  if (s < 0) return null;
  const e = lines.findIndex((l, i) => i > s && clean(l) === end);
  return lines.slice(s + 1, e < 0 ? undefined : e);
}

export function parseSlotReply(reply: string, version: TemplateVersion): SlotReply {
  const text = reply.replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n').filter((l) => !isFence(l));
  const first = lines.find((l) => clean(l) !== '');
  if (first && clean(first) === 'INPUTS INCOMPLETE') return { status: 'incomplete', text };

  const names = slotsFor(version);
  const unbold = (ls: string[]) => ls.map((l) => l.replace(/\*\*/g, ''));
  const body = section(lines, BLOCK_START, BLOCK_END);
  const src = section(lines, 'SOURCES', 'END SOURCES');
  const block = readNamedLines(unbold(body ?? []), names);
  const sources = readNamedLines(unbold(src ?? []), names);

  const slots: Record<string, string> = {};
  for (const [k, v] of Object.entries(block.values)) slots[k] = v.replace(/^\n/, '').trim();
  const srcOut: Record<string, string> = {};
  for (const [k, v] of Object.entries(sources.values)) srcOut[k] = v.replace(/^\n/, '').trim();

  return {
    status: 'parsed',
    found: body !== null,
    slots,
    sources: srcOut,
    missing: names.filter((n) => !(n in slots)),
    empty: names.filter((n) => n in slots && slots[n] === ''),
    unknown: [...new Set(block.unknown)],
    duplicates: [...new Set(block.duplicates)],
  };
}

export const STAGE1_LABELS = ['Principles', 'Society', 'Domain', 'Scope', 'Condition', 'Mechanism', 'Measurement',
  'Nearest excluded cause', 'Counter-example point', 'Tension'] as const;

const LABEL_LINE = new RegExp(`^\\s*(${STAGE1_LABELS.join('|')})\\s*:\\s*(.*)$`, 'i');
const NUMBER_LINE = /^\s*(\d+)\.\s+(.*)$/;

export function expectedStage1Labels(version: TemplateVersion): string[] {
  return STAGE1_LABELS.filter((l) => version === '2.5' || l !== 'Domain');
}

export function parseStage1(reply: string, version: TemplateVersion): { settings: Stage1Setting[]; warnings: string[] } {
  const lines = reply.replace(/\r\n/g, '\n').split('\n');
  const warnings: string[] = [];
  let start = lines.findIndex((l) => clean(l) === 'SETTINGS');
  if (start < 0) {
    warnings.push('The line SETTINGS was not found. The whole reply was read.');
    start = -1;
  }
  const rest = lines.slice(start + 1);
  const starts: number[] = [];
  rest.forEach((l, i) => { if (NUMBER_LINE.test(clean(l))) starts.push(i); });

  const settings: Stage1Setting[] = starts.map((s, k) => {
    const chunk = rest.slice(s, k + 1 < starts.length ? starts[k + 1] : undefined);
    const rawText = chunk.join('\n').trim();
    const m = clean(chunk[0]).match(NUMBER_LINE)!;
    const fields: Record<string, string> = {};
    let current = 'Setting';
    const acc: Record<string, string[]> = { Setting: [m[2]] };
    for (const line of chunk.slice(1)) {
      const lm = clean(line).match(LABEL_LINE);
      if (lm) {
        current = STAGE1_LABELS.find((x) => x.toLowerCase() === lm[1].toLowerCase())!;
        acc[current] = [lm[2]];
      } else {
        acc[current].push(line.replace(/\*\*/g, ''));
      }
    }
    for (const [k2, v] of Object.entries(acc)) fields[k2] = v.join('\n').trim();
    return { number: Number(m[1]), rawText, fields };
  });

  if (settings.length !== 5) warnings.push(`Expected five settings; found ${settings.length}.`);
  const expected = expectedStage1Labels(version);
  for (const s of settings) {
    const missing = expected.filter((l) => !(l in s.fields));
    if (missing.length) warnings.push(`Setting ${s.number} has no line: ${missing.join(', ')}.`);
  }
  return { settings, warnings };
}

export const TAG_RE = /\[N([12])\.(\d+)\]/;

export interface Opening { tag: string; text: string; otherDimension: boolean }

/** Part 3 of a stage 2 reply: one question per paragraph (or per list item), each starting with a paragraph tag. */
export function parseOpenings(part3: string): { openings: Opening[]; untagged: number } {
  const items: string[] = [];
  let cur: string[] = [];
  const flush = () => { if (cur.length) items.push(cur.join(' ')); cur = []; };
  for (const raw of part3.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const stripped = line.replace(/^(\d+\.|[-*•])\s+/, '').replace(/\*\*/g, '');
    if (stripped !== line.replace(/\*\*/g, '') || /^\[N[12]\.\d+\]/.test(stripped)) flush(); // a list item or a tag starts a new item
    cur.push(stripped);
  }
  flush();
  const openings: Opening[] = [];
  let untagged = 0;
  for (const item of items) {
    const m = item.match(/^\[(N[12]\.\d+)\]\s*(.*)$/);
    if (m) openings.push({ tag: m[1], text: m[2].trim(), otherDimension: /\(other dimension\)/i.test(m[2]) });
    else untagged++;
  }
  return { openings, untagged };
}
