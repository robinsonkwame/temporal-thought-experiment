// Small text helpers shared by the checks, the rendering and the parsers.
import type { Run, DimKey, ScaleKey } from './types';
import { STATIC, dimLabel } from './types';

/** Remove parenthetical citations such as "(Rennecker & Godwin, 2005; Addas & Pinsonneault, 2018)". */
export function stripCitations(s: string): string {
  return s.replace(/\s*\([^()]*\d{4}[^()]*\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Lower case, straight quotes, single spaces, for comparisons. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/->|=>|⟶|→/g, '→')
    .replace(/\s*→\s*/g, ' → ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Words only: for "first five words" style comparisons. */
export function words(s: string): string[] {
  return norm(s).replace(/[^\p{L}\p{N}' ]+/gu, ' ').split(' ').filter(Boolean);
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** The items of a cell of the temporal list, without citations ("a; b" gives ["a", "b"]). */
export function cellItems(entry: string): string[] {
  return stripCitations(entry).split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);
}

export function cellWords(entry: string): string {
  return cellItems(entry).join('; ');
}

/** "Rhythm, cycle and entrainment; micro: “attention and interruption rhythms”" */
export function cellInListWords(cell: { dimension: DimKey; scale: ScaleKey; entry: string }): string {
  return `${dimLabel(cell.dimension)}; ${cell.scale}: “${cellWords(cell.entry)}”`;
}

export function isStaticCell(cell: { dimension: DimKey; scale: ScaleKey; entry: string }): boolean {
  return STATIC.cells.some((c) => c.dimension === cell.dimension && c.scale === cell.scale && c.entry === cell.entry);
}

/** C contains the words of at least one item of the cell (case-insensitive, citations ignored). */
export function cContainsCellWords(cText: string, entry: string): boolean {
  const c = norm(cText);
  return cellItems(entry).some((item) => c.includes(norm(item)));
}

/** Relationships listed in a representation cell, e.g. "FC → BI (+); FC → Use (+)" gives ["fc → bi", "fc → use"]. */
export function listedRelationships(s: string): string[] {
  return s.split(/[;,\n]/).map((x) => norm(x.replace(/\([^)]*\)/g, ''))).filter((x) => x.includes('→'));
}

export function sameRelationship(a: string, b: string): boolean {
  return norm(a.replace(/\([^)]*\)/g, '')) === norm(b.replace(/\([^)]*\)/g, ''));
}

/** Map of abbreviations to full construct names from the representation ("Social Influence (SI)"). */
export function constructNames(run: Run): Map<string, string> {
  const m = new Map<string, string>();
  for (const row of run.representation) {
    const match = row.construct.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (match) m.set(match[2].trim().toLowerCase(), match[1].trim());
    else if (row.construct.trim()) m.set(row.construct.trim().toLowerCase(), row.construct.trim());
  }
  return m;
}

/** A text contains a relationship, written either as "SI → BI" or with the constructs' full names. */
export function textContainsRelationship(text: string, relationship: string, names: Map<string, string>): boolean {
  const t = norm(text);
  if (t.includes(norm(relationship))) return true;
  const sides = norm(relationship).split(' → ');
  if (sides.length !== 2) return false;
  return sides.every((side) => {
    const full = names.get(side);
    const re = new RegExp(`(^|[^\\p{L}])${escapeRe(side)}([^\\p{L}]|$)`, 'u');
    return re.test(t) || (full !== undefined && t.includes(norm(full)));
  });
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace every occurrence of a placeholder without regex or "$" substitution patterns. */
export function replaceExact(template: string, placeholder: string, value: string): string {
  return template.split(placeholder).join(value);
}

/** "2026-10-29" stays as it is; a full ISO time becomes "2026-10-29 09:12" in local time. */
export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtTime(iso: string | undefined): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
