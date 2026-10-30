// Synthetic tables of stage 2 and the implied-paths calculator (brief, section 8.5).
import type { PathsResult } from './types';

export interface MdTable { raw: string; header: string[]; rows: string[][] }
export type SyntheticTables = Partial<Record<'A' | 'B' | 'C', MdTable>>;

const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isRule = (l: string) => /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** Each Markdown table that follows a line containing "Table A", "Table B" or "Table C". */
export function parseSyntheticTables(text: string): SyntheticTables {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: SyntheticTables = {};
  for (let i = 0; i < lines.length; i++) {
    if (isRow(lines[i])) continue;
    const m = lines[i].match(/Table ([ABC])\b/);
    if (!m || out[m[1] as 'A']) continue;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== '' && !isRow(lines[j])) j++; // a line or two of text may come between
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j >= lines.length || !isRow(lines[j])) continue;
    const tableLines: string[] = [];
    while (j < lines.length && isRow(lines[j])) tableLines.push(lines[j++]);
    const body = tableLines.filter((l) => !isRule(l));
    out[m[1] as 'A'] = { raw: tableLines.join('\n'), header: cells(body[0]), rows: body.slice(1).map(cells) };
  }
  return out;
}

export function parseCoef(s: string): number | null {
  const m = s.trim().match(/^([−-])?\s*(\d*\.\d+|\d+)$/);
  if (!m) return null;
  const v = Number(m[2]);
  return m[1] ? -v : v;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** The columns of Table B that hold coefficients: every header except the first and "Notes". */
export function coefficientColumns(t: MdTable): number[] {
  return t.header.map((_, i) => i).filter((i) => i > 0 && !/^notes?$/i.test(t.header[i]));
}

export function pathsForColumn(a: number, c: number, b0: number) {
  const den = 1 - a * a;
  const direct = (c - a * b0) / den;
  const medToY = (b0 - a * c) / den;
  const indirect = a * medToY;
  const share = indirect / (indirect + direct);
  return { xToMed: r2(a), direct: r2(direct), medToY: r2(medToY), indirect: r2(indirect), share: r2(share) };
}

/** Implied paths from the rows of Table B holding X–Med, X–Y and Med–Y, per column. */
export function impliedPaths(tableB: MdTable, rows: { xMed: string; xY: string; medY: string }): PathsResult {
  const find = (label: string) => tableB.rows.find((r) => r[0] === label);
  const [rm, ry, rb] = [find(rows.xMed), find(rows.xY), find(rows.medY)];
  const columns: PathsResult['columns'] = [];
  if (rm && ry && rb) {
    for (const i of coefficientColumns(tableB)) {
      const a = parseCoef(rm[i] ?? ''), c = parseCoef(ry[i] ?? ''), b0 = parseCoef(rb[i] ?? '');
      if (a === null || c === null || b0 === null) continue;
      columns.push({ label: tableB.header[i], a, c, b0, ...pathsForColumn(a, c, b0) });
    }
  }
  return { ...rows, columns };
}

/** ".36", "-.12", "1.00": two decimals without a leading zero, as in the paper's tables. */
export function fmtCoef(x: number): string {
  const s = Math.abs(x).toFixed(2).replace(/^0(?=\.)/, '');
  return x < 0 ? `−${s}` : s;
}
