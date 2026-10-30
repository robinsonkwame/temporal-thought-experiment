// Renders the six tables for prompt 1 (brief, section 7.2).
import type { Run, Pick } from './types';
import { AUDIT_DIMS, STATIC, dimLabel, setupKeysFor } from './types';
import { fmtDateTime, capitalise } from './text';
import { setAsideReason, currentPick } from './pick';

export function cell(s: string): string {
  return s.replace(/\r?\n/g, '<br>').replace(/\|/g, '/');
}

function pipeTable(header: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.map(cell).join(' | ')} |`;
  return [line(header), `|${header.map(() => '---').join('|')}|`, ...rows.map(line)].join('\n');
}

function section(caption: string, table: string, after?: string): string {
  return `${caption}\n\n${table}${after ? `\n${after}` : ''}`;
}

const AUDIT_HEAD: Record<string, string> = {
  duration: 'Duration', sequence: 'Sequence', rhythm: 'Rhythm, cycle', timing: 'Timing', speed: 'Speed', trajectory: 'Trajectory',
};

export function answerText(value: string, note: string, sep: ' (' | ': '): string {
  const v = value ? capitalise(value) : '';
  if (!note) return v;
  return sep === ' (' ? `${v} (${note})` : `${v}: ${note}`;
}

export function renderAudit(run: Run): string {
  return section('Table 1. Audit', pipeTable(
    ['Relationship', ...AUDIT_DIMS.map((d) => AUDIT_HEAD[d])],
    run.audit.map((r) => [r.relationship, ...AUDIT_DIMS.map((d) => answerText(r.answers[d].value, r.answers[d].note, ' ('))]),
  ));
}

export function pickLine(p: Pick, picks: Pick[]): string {
  const aside = setAsideReason(p, picks);
  const byHand = p.how === 'by hand' && p.reason && !picks.slice(0, picks.indexOf(p)).some((q) => q.kind === p.kind)
    ? `; reason: ${p.reason}` : '';
  return `${p.kind}, ${p.how}, ${fmtDateTime(p.at)}: ${p.value}${byHand}${aside !== null ? `; set aside: ${aside}` : ''}`;
}

export function cellPickedText(run: Run): string {
  const c = run.draw.cell;
  if (!c) return '';
  const p = currentPick(run.draw.picks, 'cell');
  const k = p?.index !== undefined && p?.of !== undefined ? `Cell ${p.index} of ${p.of}. ` : '';
  return `${k}${dimLabel(c.dimension)}; ${c.scale.toLowerCase()}: “${c.entry}”`;
}

export function conceptionPickedText(run: Run): string {
  const c = run.draw.conception;
  if (!c) return '';
  return `Conception ${c.n} of ${STATIC.conceptions.length}: ${c.name.toLowerCase()}`;
}

export function relationshipPickedText(run: Run): string {
  if (!run.draw.relationship) return '';
  const p = currentPick(run.draw.picks, 'relationship');
  const k = p?.index !== undefined && p?.of !== undefined ? `Relationship ${p.index} of ${p.of}: ` : '';
  return `${k}${run.draw.relationship}`;
}

export function renderDraw(run: Run): string {
  const t = run.theory;
  const unit = t.unitNote ? `${t.unit}: ${t.unitNote}` : t.unit;
  const rule = run.draw.ruleFixedAt ? `${run.draw.rule} (fixed ${fmtDateTime(run.draw.ruleFixedAt)})` : run.draw.rule;
  const rows: string[][] = [
    ['Theory and source', `${t.name} (${t.source})`],
    ['Unit of analysis', unit],
    ['Rule, fixed before the audit', rule],
    ['Cell picked', cellPickedText(run)],
    ['Conception of time picked', conceptionPickedText(run)],
    ['C as written', run.draw.cText],
    ['Relationship picked', relationshipPickedText(run)],
    ['Relationship terms', run.draw.relationshipTerms.join('; ')],
    ['Picks', run.draw.picks.map((p) => pickLine(p, run.draw.picks)).join('\n')],
  ];
  return section('Table 2. Draw record', pipeTable(['Item', 'Record'], rows));
}

export function renderRepresentation(run: Run): string {
  return section('Table 3. Representation', pipeTable(
    ['Construct', 'Role', 'Hypothesised relationships', 'Moderators', 'Stated scope conditions', 'Dimensions the theory leaves unstated'],
    run.representation.map((r) => [r.construct, r.role, r.relationships, r.moderators, r.scope, r.unstated]),
  ));
}

export function survivors(run: Run) {
  return run.instances.filter((i) => i.screening === 'survives');
}

export function renderInstances(run: Run): string {
  const surv = survivors(run);
  const rows: string[][] = [
    ['Relationship varied', ...surv.map((i) => i.relationship)],
    ['Change type', ...surv.map((i) => i.changeType)],
    ['Relationship terms', ...surv.map((i) => i.terms.join('; '))],
    ['One-line description', ...surv.map((i) => i.description)],
    ['Screening', ...surv.map(() => 'Survives')],
  ];
  const aside = run.instances.filter((i) => i.screening === 'set aside');
  const after = aside.length ? `Set aside: ${aside.map((i) => `${i.id}, ${i.description}: ${i.reason}`).join('; ')}` : undefined;
  return section('Table 4. Candidate instances', pipeTable(['', ...surv.map((i) => `Instance ${i.id}`)], rows), after);
}

export function transformCards(run: Run) {
  return survivors(run).map((i) => ({ instance: i, card: run.transform.find((t) => t.instanceId === i.id) }));
}

export function renderTransform(run: Run): string {
  const cards = transformCards(run);
  const crit = (n: number) => cards.map(({ card }) => (card ? answerText(card.criteria[n].value, card.criteria[n].note, ': ') : ''));
  const rows: string[][] = [
    ['C, in the list\'s words', ...cards.map(({ card }) => card?.cWords ?? '')],
    ['Candidate M', ...cards.map(({ card }) => card?.candidateM ?? '')],
    ['1. M specific and interpretable', ...crit(0)],
    ['2. R′ detectable', ...crit(1)],
    ['3. Temporal check', ...crit(2)],
    ['4. C in the list\'s words', ...crit(3)],
    ['Selected', ...cards.map(({ card }) => (card?.selected ? 'Yes' : 'No'))],
  ];
  return section('Table 5. Transform', pipeTable(['', ...cards.map(({ instance }) => `Instance ${instance.id}`)], rows));
}

export function setupLabel(key: string): string {
  return STATIC.setupRows.find((r) => r.key === key)?.label ?? key;
}

export function renderSetup(run: Run): string {
  return section('Table 6. Provoke set-up', pipeTable(
    ['Row', 'Entry'],
    setupKeysFor(run.templateVersion).map((k) => [setupLabel(k), run.setup[k] ?? '']),
  ));
}

export function renderTables(run: Run): string {
  return [renderAudit(run), renderDraw(run), renderRepresentation(run), renderInstances(run), renderTransform(run), renderSetup(run)].join('\n\n');
}
