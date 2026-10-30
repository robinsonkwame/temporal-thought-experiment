// The provided prompt templates, imported as they are (never edited).
import p1v24 from '../content/prompts/v2.4/01_slot_prompt.txt?raw';
import p2v24 from '../content/prompts/v2.4/02_stage1.txt?raw';
import p3v24 from '../content/prompts/v2.4/03_stage2.txt?raw';
import c3v24 from '../content/prompts/v2.4/03_stage2_checklist.txt?raw';
import p4v24 from '../content/prompts/v2.4/04_cutoff_check.txt?raw';
import p1v25 from '../content/prompts/v2.5/01_slot_prompt.txt?raw';
import p2v25 from '../content/prompts/v2.5/02_stage1.txt?raw';
import p3v25 from '../content/prompts/v2.5/03_stage2.txt?raw';
import c3v25 from '../content/prompts/v2.5/03_stage2_checklist.txt?raw';
import p4v25 from '../content/prompts/v2.5/04_cutoff_check.txt?raw';
import type { TemplateVersion } from './types';

export interface TemplateSet {
  slot: string;
  stage1: string;
  stage2: string;
  stage2Checklist: string;
  cutoff: string;
}

export const TEMPLATES: Record<TemplateVersion, TemplateSet> = {
  '2.4': { slot: p1v24, stage1: p2v24, stage2: p3v24, stage2Checklist: c3v24, cutoff: p4v24 },
  '2.5': { slot: p1v25, stage1: p2v25, stage2: p3v25, stage2Checklist: c3v25, cutoff: p4v25 },
};

export function templatesFor(version: TemplateVersion): TemplateSet {
  return TEMPLATES[version];
}

/** The check list of prompt 3, split into its lead-in, one clause per checkbox, and its closing text. */
export function checklistClauses(version: TemplateVersion): { lead: string; clauses: string[]; tail: string } {
  const text = TEMPLATES[version].stage2Checklist.trim();
  const marker = 'if an account: ';
  const i = text.indexOf(marker);
  if (i < 0) return { lead: text, clauses: [], tail: '' };
  const lead = text.slice(0, i + marker.length - 1);
  const rest = text.slice(i + marker.length);
  const end = rest.indexOf('. ');
  const body = end < 0 ? rest : rest.slice(0, end);
  const tail = end < 0 ? '' : rest.slice(end + 2);
  const clauses = body.split('; ').map((c) => c.replace(/^or /, '').trim()).filter(Boolean);
  return { lead, clauses, tail };
}
