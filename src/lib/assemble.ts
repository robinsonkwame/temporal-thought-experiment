// Prompt assembly (brief, section 7.1). Only the exact placeholder strings are replaced.
import type { Run } from './types';
import { templatesFor } from './templates';
import { renderTables } from './render-tables';
import { parseBlock } from './block';
import { replaceExact } from './text';

export const PH_TABLES = '<PASTE THE SIX TABLES HERE>';
export const PH_BLOCK = '<PASTE THE CONFIRMED SLOT VALUES BLOCK FROM MESSAGE 1 HERE, FROM "SLOT VALUES" TO "END SLOT VALUES">';
export const PH_SETTING = '<PASTE THE CHOSEN SETTING FROM THE STAGE 1 OUTPUT HERE, ALL ITS LINES FROM THE SETTING TO THE TENSION>';
export const PH_CUTOFF = '<PASTE THE LINES PRIOR_EVIDENCE, TEMPORAL_FEATURE AND PROPOSAL FROM THE CONFIRMED SLOT VALUES BLOCK HERE>';

export function assembleSlotPrompt(run: Run): string {
  return replaceExact(templatesFor(run.templateVersion).slot, PH_TABLES, renderTables(run));
}

export function assembleStage1Prompt(run: Run): string {
  return replaceExact(templatesFor(run.templateVersion).stage1, PH_BLOCK, run.provoke.slot?.confirmedBlock ?? '');
}

export function chosenSettingText(run: Run): string {
  const s1 = run.provoke.stage1;
  if (!s1 || s1.chosen === undefined) return '';
  return s1.settings.find((s) => s.number === s1.chosen)?.rawText ?? '';
}

export function assembleStage2Prompt(run: Run): string {
  const t = replaceExact(templatesFor(run.templateVersion).stage2, PH_BLOCK, run.provoke.slot?.confirmedBlock ?? '');
  return replaceExact(t, PH_SETTING, chosenSettingText(run));
}

export function cutoffLines(run: Run): string {
  const block = run.provoke.slot?.confirmedBlock ?? '';
  const { values } = parseBlock(block, run.templateVersion);
  return ['PRIOR_EVIDENCE', 'TEMPORAL_FEATURE', 'PROPOSAL']
    .map((n) => `${n}:${(values[n] ?? '').startsWith('\n') ? '' : ' '}${values[n] ?? ''}`)
    .join('\n');
}

export function assembleCutoffPrompt(run: Run): string {
  return replaceExact(templatesFor(run.templateVersion).cutoff, PH_CUTOFF, cutoffLines(run));
}

export function promptWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
