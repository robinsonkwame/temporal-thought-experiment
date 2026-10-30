// Step checks (brief, section 6.1) and the table check before prompt 1 (section 8.1).
import type { Run } from './types';
import { AUDIT_DIMS, STATIC, dimLabel, setupKeysFor } from './types';
import {
  cContainsCellWords, isStaticCell, listedRelationships, norm, sameRelationship, constructNames,
  textContainsRelationship, words,
} from './text';
import { currentPick } from './pick';
import { survivors } from './render-tables';
import { isStale } from './deps';
import { lintStage2, lintFindings } from './lint';

/** missing: not yet filled (in progress); error: inconsistent (needs attention); warning: shown, never blocks. */
export type Severity = 'missing' | 'error' | 'warning';
export interface Finding { step: number; severity: Severity; message: string }

const blank = (s: string | undefined) => !s || !s.trim();

export function isAdmissibleChange(changeType: string): boolean {
  return STATIC.admissibleChanges.some((c) => norm(c) === norm(changeType));
}

export function selectedCard(run: Run) {
  const ids = new Set(survivors(run).map((i) => i.id));
  return run.transform.filter((t) => t.selected && ids.has(t.instanceId));
}

function step0(run: Run): Finding[] {
  const f: Finding[] = [];
  if (blank(run.title)) f.push({ step: 0, severity: 'missing', message: 'Give the run a title.' });
  if (blank(run.theory.name)) f.push({ step: 0, severity: 'missing', message: 'Enter the theory name.' });
  if (blank(run.theory.source)) f.push({ step: 0, severity: 'missing', message: 'Enter the full reference.' });
  return f;
}

function step1(run: Run): Finding[] {
  const f: Finding[] = [];
  if (!run.audit.length) f.push({ step: 1, severity: 'missing', message: 'List at least one relationship.' });
  run.audit.forEach((r, i) => {
    if (blank(r.relationship)) f.push({ step: 1, severity: 'missing', message: `Row ${i + 1} has no relationship.` });
    const open = AUDIT_DIMS.filter((d) => !r.answers[d].value);
    if (open.length) f.push({ step: 1, severity: 'missing', message: `${r.relationship || `Row ${i + 1}`}: answer ${open.map((d) => dimLabel(d).toLowerCase()).join(', ')}.` });
  });
  return f;
}

function step2(run: Run): Finding[] {
  const f: Finding[] = [];
  if (!run.draw.scales.length) f.push({ step: 2, severity: 'missing', message: 'Choose at least one scale.' });
  if (blank(run.draw.rule)) f.push({ step: 2, severity: 'missing', message: 'Write the rule.' });
  if (!run.draw.ruleFixedAt) f.push({ step: 2, severity: 'missing', message: 'Fix the rule before you pick.' });
  return f;
}

function step3(run: Run): Finding[] {
  const f: Finding[] = [];
  const d = run.draw;
  for (const kind of ['cell', 'conception', 'relationship'] as const) {
    if (!currentPick(d.picks, kind)) f.push({ step: 3, severity: 'missing', message: `Pick a ${kind}.` });
  }
  if (d.cell && !isStaticCell(d.cell)) f.push({ step: 3, severity: 'error', message: 'The picked cell is not a cell of the temporal list.' });
  if (d.cell && !d.scales.includes(d.cell.scale)) f.push({ step: 3, severity: 'error', message: 'The picked cell is outside the scales of the rule.' });
  if (blank(d.cText)) f.push({ step: 3, severity: 'missing', message: 'Write C.' });
  else if (d.cell && !cContainsCellWords(d.cText, d.cell.entry)) f.push({ step: 3, severity: 'error', message: 'C does not contain the words of the picked cell.' });
  if (d.relationship && d.cell) {
    const row = run.audit.find((r) => sameRelationship(r.relationship, d.relationship));
    if (!row) f.push({ step: 3, severity: 'error', message: `${d.relationship} is not a row of the audit.` });
    else if (row.answers[d.cell.dimension].value !== 'no') f.push({ step: 3, severity: 'error', message: `${d.relationship} does not have “no” on ${dimLabel(d.cell.dimension).toLowerCase()} in the audit.` });
  }
  if (!d.relationshipTerms.length) f.push({ step: 3, severity: 'missing', message: 'Choose the relationship terms.' });
  return f;
}

function step4(run: Run): Finding[] {
  const f: Finding[] = [];
  if (!run.representation.length) f.push({ step: 4, severity: 'missing', message: 'Enter at least one construct.' });
  run.representation.forEach((r, i) => {
    const empty = (['construct', 'role', 'relationships', 'moderators', 'scope', 'unstated'] as const).filter((k) => blank(r[k]));
    if (empty.length) f.push({ step: 4, severity: 'missing', message: `${r.construct || `Row ${i + 1}`}: fill ${empty.join(', ')}.` });
  });
  const rel = run.draw.relationship;
  if (rel && run.representation.length && !run.representation.some((r) => listedRelationships(r.relationships).includes(norm(rel)))) {
    f.push({ step: 4, severity: 'error', message: `The picked relationship ${rel} does not appear in the representation.` });
  }
  return f;
}

function step5(run: Run): Finding[] {
  const f: Finding[] = [];
  if (!survivors(run).length) f.push({ step: 5, severity: 'missing', message: 'At least one instance must survive the screening.' });
  for (const i of run.instances) {
    const empty = [blank(i.relationship) && 'relationship', blank(i.changeType) && 'change type', !i.terms.length && 'relationship terms',
      blank(i.description) && 'description'].filter(Boolean);
    if (empty.length) f.push({ step: 5, severity: 'missing', message: `Instance ${i.id}: fill ${empty.join(', ')}.` });
    if (i.screening === 'set aside' && blank(i.reason)) f.push({ step: 5, severity: 'missing', message: `Instance ${i.id} is set aside without a reason.` });
    if (run.draw.relationship && !blank(i.relationship) && !sameRelationship(i.relationship, run.draw.relationship)) {
      f.push({ step: 5, severity: 'error', message: `Instance ${i.id} varies ${i.relationship}, not the picked relationship ${run.draw.relationship}.` });
    }
  }
  return f;
}

function step6(run: Run): Finding[] {
  const f: Finding[] = [];
  const surv = survivors(run);
  for (const i of surv) {
    const c = run.transform.find((t) => t.instanceId === i.id);
    if (!c || blank(c.candidateM)) f.push({ step: 6, severity: 'missing', message: `Instance ${i.id}: write the candidate M.` });
    if (c && blank(c.cWords)) f.push({ step: 6, severity: 'missing', message: `Instance ${i.id}: write C in the list's words.` });
    if (c && c.criteria.some((x) => !x.value)) f.push({ step: 6, severity: 'missing', message: `Instance ${i.id}: judge all four criteria.` });
  }
  const sel = selectedCard(run);
  if (surv.length && sel.length === 0) f.push({ step: 6, severity: 'missing', message: 'Select one instance.' });
  if (sel.length > 1) f.push({ step: 6, severity: 'error', message: 'Select only one instance.' });
  if (sel.length === 1 && sel[0].criteria.some((x) => x.value !== 'yes')) f.push({ step: 6, severity: 'error', message: `The selected instance ${sel[0].instanceId} does not pass all four criteria.` });
  return f;
}

function step7(run: Run): Finding[] {
  const f: Finding[] = [];
  const empty = setupKeysFor(run.templateVersion).filter((k) => blank(run.setup[k]));
  if (empty.length) f.push({ step: 7, severity: 'missing', message: `Fill row${empty.length > 1 ? 's' : ''} ${empty.join(', ')}.` });
  return f;
}

/** The cross-table checks of section 8.1 that are not already part of a step's own checks. */
function crossChecks(run: Run): Finding[] {
  const f: Finding[] = [];
  const rel = run.draw.relationship;
  const b = run.setup.b ?? '';
  if (rel && !blank(b) && !textContainsRelationship(b, rel, constructNames(run))) {
    f.push({ step: 7, severity: 'error', message: `Row b does not contain the picked relationship ${rel}.` });
  }
  const sel = selectedCard(run);
  const d = run.setup.d ?? '';
  if (sel.length === 1 && !blank(d) && !blank(sel[0].candidateM)) {
    const first = words(sel[0].candidateM).slice(0, 5).join(' ');
    if (!words(d).join(' ').includes(first)) f.push({ step: 7, severity: 'warning', message: `Row d does not contain the first five words of the selected candidate M (“${first}”).` });
  }
  return f;
}

export function stepFindings(run: Run, step: number): Finding[] {
  switch (step) {
    case 0: return step0(run);
    case 1: return step1(run);
    case 2: return step2(run);
    case 3: return step3(run);
    case 4: return step4(run);
    case 5: return step5(run);
    case 6: return step6(run);
    case 7: return [...step7(run), ...crossChecks(run)];
    case 9: {
      const s = run.provoke.slot;
      if (!s || s.status !== 'confirmed') return [{ step: 9, severity: 'missing', message: 'Confirm the slot values.' }];
      return [];
    }
    case 10: {
      const s = run.provoke.stage1;
      if (!s?.exchange.replyText) return [{ step: 10, severity: 'missing', message: 'Paste the reply to prompt 2.' }];
      if (s.chosen === undefined) return [{ step: 10, severity: 'missing', message: 'Choose one setting.' }];
      return [];
    }
    case 11: {
      const s = run.provoke.stage2;
      if (!s?.drafts.some((d) => d.status === 'kept')) return [{ step: 11, severity: 'missing', message: 'Keep one draft.' }];
      return [];
    }
    case 13: {
      if (!run.provoke.cutoff?.exchange.replyText) return [{ step: 13, severity: 'missing', message: 'Paste the reply to prompt 4.' }];
      return [];
    }
    default: return [];
  }
}

/** The table check before prompt 1: every finding of steps 0 to 7. */
export function tableCheck(run: Run): Finding[] {
  return [0, 1, 2, 3, 4, 5, 6, 7].flatMap((s) => stepFindings(run, s));
}

export type StepState = 'empty' | 'in progress' | 'complete' | 'needs attention' | 'out of date';

export function stepHasContent(run: Run, step: number): boolean {
  const p = run.provoke;
  switch (step) {
    case 0: return !blank(run.title) || !blank(run.theory.name);
    case 1: return run.audit.length > 0;
    case 2: return !!run.draw.ruleFixedAt;
    case 3: return run.draw.picks.some((p2) => p2.kind !== 'change');
    case 4: return run.representation.length > 0;
    case 5: return run.instances.length > 0;
    case 6: return run.transform.length > 0;
    case 7: return 'abcdefghijklm'.split('').some((k) => !blank(run.setup[k as 'a']));
    case 8: return !blank(p.settings.model);
    case 9: return (p.slot?.attempts.length ?? 0) > 0 || !!p.slot?.confirmedBlock;
    case 10: return !!(p.stage1?.exchange.copiedAt || p.stage1?.exchange.replyText);
    case 11: return (p.stage2?.drafts.length ?? 0) > 0;
    case 12: return !!p.stage2?.drafts.some((d) => d.status === 'kept');
    case 13: return !!(p.cutoff?.exchange.copiedAt || p.cutoff?.exchange.replyText);
    case 14: return [9, 10, 11, 12, 13].some((s) => stepHasContent(run, s));
    default: return false;
  }
}

export function stepState(run: Run, step: number): StepState {
  if (isStale(run, step)) return 'out of date';
  if (!stepHasContent(run, step)) return 'empty';
  const f = stepFindings(run, step);
  if (f.some((x) => x.severity === 'error')) return 'needs attention';
  if (f.some((x) => x.severity === 'missing')) return 'in progress';
  return 'complete';
}

/** Lint of a stage 2 reply against the run's confirmed block. */
export function lintFor(run: Run, reply: string) {
  const block = run.provoke.slot?.confirmedBlock ?? '';
  const m = block.match(/^T_TERMS_TO_EXCLUDE:\s*(.*)$/m);
  const report = lintStage2(reply, { termsToExclude: m?.[1] ?? '', expectPart3: run.templateVersion === '2.5' });
  return { report, findings: lintFindings(report) };
}
