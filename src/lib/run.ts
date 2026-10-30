// Making runs: a new run, a copy of a shared run, a copy of the example.
import type { Run, TemplateVersion, AuditRow } from './types';
import { STATIC, AUDIT_DIMS } from './types';
import { zRun } from './schema';

export const DEFAULT_SETTINGS: Run['provoke']['settings'] = {
  app: 'Claude application', model: 'Claude Opus 4.6', modelId: 'claude-opus-4-6', knowledgeCutoff: 'May 2025',
  trainingDataTo: 'August 2025', extendedThinking: true, memory: false, tools: false,
};

export const STYLE_DEFAULT = STATIC.setupRows.find((r) => r.key === 'n')?.default ?? '';

export function emptyAuditRow(relationship = ''): AuditRow {
  return {
    relationship,
    answers: Object.fromEntries(AUDIT_DIMS.map((d) => [d, { value: '', note: '' }])) as AuditRow['answers'],
  };
}

export function newRun(now = new Date().toISOString()): Run {
  return {
    schema: 'tte-run/1',
    templateVersion: '2.5',
    title: '',
    createdAt: now,
    updatedAt: now,
    theory: { name: '', source: '', unit: 'individual', unitNote: '' },
    audit: [],
    draw: { rule: '', scales: [...STATIC.drawingRuleDefault.individual], picks: [], cell: null, conception: null, relationship: '', cText: '', relationshipTerms: [] },
    representation: [],
    instances: [],
    transform: [],
    setup: { n: STYLE_DEFAULT },
    provoke: { settings: { ...DEFAULT_SETTINGS } },
    stale: [],
    log: [],
  };
}

/** A copy of a shared run, with everything in it. */
export function copyRun(run: Run, now = new Date().toISOString()): Run {
  const r = zRun.parse(structuredClone(run));
  return { ...r, title: `Copy of ${r.title}`, readOnlyExample: false, createdAt: now, updatedAt: now };
}

/** A copy of the example: keeps the tables, drops the Provoke replies, uses the chosen prompt version. */
export function copyExample(run: Run, version: TemplateVersion, now = new Date().toISOString()): Run {
  const r = zRun.parse(structuredClone(run));
  return {
    ...r,
    title: `Copy of ${r.title}`,
    templateVersion: version,
    readOnlyExample: false,
    notes: undefined,
    createdAt: now,
    updatedAt: now,
    provoke: { settings: { ...r.provoke.settings } },
    stale: [],
    log: [],
  };
}

/** A new run from a question of Part 3: the theory and the audit are copied. */
export function runFromQuestion(run: Run, question: string, now = new Date().toISOString()): Run {
  const r = newRun(now);
  return {
    ...r,
    title: `${run.theory.name}: from a question of “${run.title}”`,
    templateVersion: run.templateVersion,
    theory: { ...run.theory },
    audit: structuredClone(run.audit),
    draw: { ...r.draw, scales: [...run.draw.scales] },
    notes: [`Started from this question of the run “${run.title}”: ${question}`],
  };
}
