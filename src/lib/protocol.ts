// The protocol export (brief, section 9): the record the paper's appendix reports.
import type { Run, Exchange } from './types';
import { STATIC } from './types';
import { renderTables, cell } from './render-tables';
import { assembleSlotPrompt, assembleStage1Prompt, assembleStage2Prompt, assembleCutoffPrompt, chosenSettingText } from './assemble';
import { checklistClauses } from './templates';
import { lintFor } from './checks';
import { lintFindings, splitStage2, openingsOf } from './lint';
import { parseSyntheticTables, fmtCoef } from './paths';
import { parseStage1 } from './parse';

/** A fenced block whose fence is longer than any run of backticks inside the text. */
export function fence(text: string, lang = 'text'): string {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  const f = '`'.repeat(longest + 1);
  return `${f}${lang}\n${text.replace(/\n$/, '')}\n${f}`;
}

function table(header: string[], rows: string[][]): string {
  const line = (cs: string[]) => `| ${cs.map((c) => cell(c ?? '')).join(' | ')} |`;
  return [line(header), `|${header.map(() => '---').join('|')}|`, ...rows.map(line)].join('\n');
}

const t = (iso?: string) => iso ?? 'not recorded';

function exchange(title: string, e: Exchange | undefined, regenerated: string): string {
  const out = [`### ${title}`, ''];
  if (!e) return [...out, 'Not run.', ''].join('\n');
  if (e.promptText) {
    out.push(`Prompt as sent (copied ${t(e.copiedAt)})`, '', fence(e.promptText), '');
  } else {
    out.push(`Prompt as sent: ${e.source ?? 'not recorded'}. The prompt regenerated from the tables of this run:`, '', fence(regenerated), '');
  }
  if (e.replyText !== undefined) out.push(`Reply as received (pasted ${t(e.pastedAt)})`, '', fence(e.replyText), '');
  else out.push('No reply was pasted.', '');
  return out.join('\n');
}

export function buildProtocol(run: Run): string {
  const p = run.provoke;
  const L: string[] = [];
  const push = (...xs: string[]) => L.push(...xs);

  push(`# ${run.title || 'Untitled run'}`, '');
  push(`Protocol of a temporal thought experiment. Prompt template version ${run.templateVersion}. Run created ${run.createdAt}; last changed ${run.updatedAt}.`, '');
  if (run.notes?.length) push(...run.notes.map((n) => `> ${n}`), '');

  push('## Theory', '', table(['Item', 'Record'], [
    ['Name', run.theory.name], ['Source', run.theory.source], ['Unit of analysis', run.theory.unit], ['Note on the unit', run.theory.unitNote],
  ]), '');

  push('## Tables', '', 'The six tables as rendered for prompt 1, including the pick history.', '', renderTables(run), '');

  const s = p.settings;
  push('## Model settings', '', table(['Setting', 'Value'], [
    ['App', s.app], ['Model', s.model], ['Model identifier', s.modelId], ['Knowledge cut-off', s.knowledgeCutoff],
    ['Training data to', s.trainingDataTo], ['Extended thinking', s.extendedThinking ? 'on' : 'off'],
    ['Memory', s.memory ? 'on' : 'off'], ['Tools', s.tools ? 'on' : 'off'],
  ]), '');

  push('## Prompts and replies', '');
  const attempts = p.slot?.attempts ?? [];
  if (!attempts.length) push(exchange('Prompt 1: the slot prompt', undefined, ''));
  attempts.forEach((a, i) => push(exchange(`Prompt 1: the slot prompt, attempt ${i + 1}`, a, assembleSlotPrompt(run))));
  push(exchange('Prompt 2: stage 1', p.stage1?.exchange, assembleStage1Prompt(run)));
  const drafts = p.stage2?.drafts ?? [];
  if (!drafts.length) push(exchange('Prompt 3: stage 2', undefined, ''));
  drafts.forEach((d, i) => push(exchange(`Prompt 3: stage 2, draft ${i + 1} (${d.status}${d.reason ? `: ${d.reason}` : ''})`, d, assembleStage2Prompt(run))));
  push(exchange('Prompt 4: cut-off check', p.cutoff?.exchange, assembleCutoffPrompt(run)));

  push('## Confirmed slot values', '');
  if (p.slot?.confirmedBlock) push(`Confirmed ${t(p.slot.confirmedAt)}.`, '', fence(p.slot.confirmedBlock), '');
  else push('Not confirmed.', '');
  push('### Edits to the slot values', '');
  push(p.slot?.edits.length ? table(['Slot', 'Before', 'After', 'Time'], p.slot.edits.map((e) => [e.slot, e.before, e.after, e.at])) : 'None.', '');

  push('## Chosen setting', '');
  const s1 = p.stage1;
  if (s1?.chosen !== undefined) {
    push(`Setting ${s1.chosen}, chosen ${t(s1.chosenAt)}. Reason: ${s1.reason ?? ''}`, '');
    const raw = chosenSettingText(run) || (s1.exchange.replyText
      ? parseStage1(s1.exchange.replyText, run.templateVersion).settings.find((x) => x.number === s1.chosen)?.rawText ?? '' : '');
    push(fence(raw), '');
  } else push('No setting chosen.', '');

  push('## Stage 2 drafts', '');
  if (drafts.length) {
    push(table(['Draft', 'Status', 'Reason', 'Copied', 'Pasted'], drafts.map((d, i) => [String(i + 1), d.status, d.reason ?? '', d.copiedAt ?? '', d.pastedAt ?? ''])), '');
    const { clauses } = checklistClauses(run.templateVersion);
    drafts.forEach((d, i) => {
      if (d.replyText === undefined) return;
      const report = d.lint ?? lintFor(run, d.replyText).report;
      push(`### Draft ${i + 1}: lint report`, '');
      push(table(['Account', 'Title', 'Words', 'Paragraphs'], report.accounts.map((a, j) => [String(j + 1), a.title, String(a.words), String(a.paragraphs)])), '');
      const f = lintFindings(report);
      push(...(f.length ? f.map((x) => `- ${x}`) : ['- Nothing flagged.']), '');
      push(`### Draft ${i + 1}: check list`, '');
      push(...clauses.map((c, j) => `- [${d.checklist?.[j] ? 'x' : ' '}] ${c}`), '');
    });
  } else push('None.', '');

  const kept = drafts.find((d) => d.status === 'kept');
  if (run.templateVersion === '2.5') {
    push('## Openings for research', '');
    const openings = p.stage2?.openings ?? (kept?.replyText ? openingsOf(kept.replyText) : []);
    push(...(openings.length ? openings.map((o) => `- [${o.tag}] ${o.text}`) : ['None.']), '');
  }

  push('## Edit log', '');
  const edits = p.stage2?.edits ?? [];
  push(edits.length ? table(['Tag', 'Rule', 'Note', 'Before', 'After', 'Time'], edits.map((e) => [e.tag, e.rule, e.note, e.before, e.after, e.at])) : 'No edits.', '');
  if (p.stage2?.editsNote) push(p.stage2.editsNote, '');

  if (kept?.replyText) {
    const parts = splitStage2(kept.replyText);
    push('## Accounts: model text and edited text', '');
    for (const a of parts.accounts) {
      push(`### ${a.heading}`, '');
      push(table(['Tag', 'Model text', 'Edited text'], a.paragraphs.map((para) => {
        const es = edits.filter((e) => e.tag === para.tag);
        return [para.tag, para.text, es.length ? es[es.length - 1].after : '(unchanged)'];
      })), '');
    }
    const tables = parseSyntheticTables(parts.part2);
    push('## Synthetic tables', '');
    for (const k of ['A', 'B', 'C'] as const) push(`Table ${k}`, '', tables[k]?.raw ?? 'Not found.', '');
  }
  if (p.stage2?.paths) {
    const r = p.stage2.paths;
    push('### Implied paths', '', `X–Med: ${r.xMed}; X–Y: ${r.xY}; Med–Y: ${r.medY}.`, '');
    const rows = ([['X → Med', 'xToMed'], ['Direct X → Y', 'direct'], ['Med → Y', 'medToY'], ['Indirect', 'indirect'], ['Share', 'share']] as const)
      .map(([label, k]) => [label, ...r.columns.map((c) => fmtCoef(c[k]))]);
    push(table(['Path', ...r.columns.map((c) => c.label)], rows), '');
  }

  push('## Cut-off check', '');
  push(p.cutoff?.exchange.replyText !== undefined ? fence(p.cutoff.exchange.replyText) : 'Not run.', '');

  push('## Log', '', 'Marks as checked, changes to a fixed rule, unlocked slot values and other choices.', '');
  push(run.log?.length ? table(['Time', 'Step', 'Action', 'Detail'], run.log.map((l) => [l.at, String(l.step), l.action, l.detail ?? ''])) : 'Nothing logged.', '');
  if (run.stale?.length) push(`Steps marked out of date at export: ${run.stale.join(', ')}.`, '');

  const tv = STATIC.templateVersions.find((v) => v.id === run.templateVersion);
  push('---', '', `Prompt template version ${run.templateVersion}${tv ? ` (${tv.date})` : ''}. Workbench version ${__APP_VERSION__}.`, '');
  return L.join('\n');
}
