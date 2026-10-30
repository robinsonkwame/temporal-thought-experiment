// The confirmed slot values block (brief, section 7.3).
import type { TemplateVersion } from './types';
import { slotsFor } from './types';

export const BLOCK_START = 'SLOT VALUES';
export const BLOCK_END = 'END SLOT VALUES';
const NAME_LINE = /^([A-Z][A-Z0-9_]*):\s*(.*)$/;

export interface NamedLines {
  values: Record<string, string>;
  order: string[];
  unknown: string[];
  duplicates: string[];
}

/**
 * Read "NAME: value" lines. A line whose name is in `names` starts a value; any other line continues the
 * current one. A value that begins on the line after its name keeps a leading line break, so that the
 * block can be written back exactly as it was read.
 */
export function readNamedLines(lines: string[], names: readonly string[]): NamedLines {
  const known = new Set(names);
  const values: Record<string, string[]> = {};
  const order: string[] = [];
  const unknown: string[] = [];
  const duplicates: string[] = [];
  let current: string | null = null;
  for (const line of lines) {
    const m = line.match(NAME_LINE);
    if (m && known.has(m[1])) {
      if (values[m[1]]) duplicates.push(m[1]);
      current = m[1];
      values[current] = [m[2]];
      if (!order.includes(current)) order.push(current);
      continue;
    }
    if (m && !known.has(m[1]) && /^[A-Z0-9_]+$/.test(m[1]) && (m[1].includes('_') || m[1].length > 3)) unknown.push(m[1]);
    if (current) values[current].push(line);
  }
  const out: Record<string, string> = {};
  for (const [k, ls] of Object.entries(values)) {
    const trimmed = ls.map((l) => l.replace(/\s+$/, ''));
    while (trimmed.length > 1 && trimmed[trimmed.length - 1] === '') trimmed.pop();
    out[k] = trimmed.join('\n');
  }
  return { values: out, order, unknown, duplicates };
}

/** Parse a block from "SLOT VALUES" to "END SLOT VALUES". Values are kept exactly as written. */
export function parseBlock(text: string, version: TemplateVersion): NamedLines {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.trim() === BLOCK_START);
  const end = lines.findIndex((l, i) => i > start && l.trim() === BLOCK_END);
  const body = start < 0 ? lines : lines.slice(start + 1, end < 0 ? undefined : end);
  return readNamedLines(body, slotsFor(version));
}

/** Every slot of the version in canonical order, one per line; a multi-line value keeps its line breaks. */
export function serializeBlock(values: Record<string, string>, version: TemplateVersion): string {
  const lines = [BLOCK_START];
  for (const name of slotsFor(version)) {
    const v = values[name] ?? '';
    lines.push(`${name}:${v.startsWith('\n') ? '' : ' '}${v}`);
  }
  lines.push(BLOCK_END);
  return lines.join('\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n');
}

/** The value of a slot for display and comparison: without the empty first line. */
export function slotText(v: string | undefined): string {
  return (v ?? '').replace(/^\n/, '');
}
