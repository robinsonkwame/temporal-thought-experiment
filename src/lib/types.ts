// Types of the run document (brief, section 4), inferred from the zod schema so the two cannot drift.
import type { z } from 'zod';
import type {
  zRun, zPick, zExchange, zLintReport, zPathsResult, zLogEntry, zTemplateVersion, zDimKey, zScaleKey,
} from './schema';
import { SETUP_KEYS } from './schema';
import staticTablesJson from '../content/static_tables.json';

export type Run = z.infer<typeof zRun>;
export type Pick = z.infer<typeof zPick>;
export type Exchange = z.infer<typeof zExchange>;
export type LintReport = z.infer<typeof zLintReport>;
export type PathsResult = z.infer<typeof zPathsResult>;
export type LogEntry = z.infer<typeof zLogEntry>;
export type TemplateVersion = z.infer<typeof zTemplateVersion>;
export type DimKey = z.infer<typeof zDimKey>;
export type ScaleKey = z.infer<typeof zScaleKey>;
export type Answer = 'yes' | 'partly' | 'no';
export type SetupKey = (typeof SETUP_KEYS)[number];
export type AuditRow = Run['audit'][number];
export type Instance = Run['instances'][number];
export type TransformCard = Run['transform'][number];
export type Draft = NonNullable<Run['provoke']['stage2']>['drafts'][number];
export type Stage1Setting = NonNullable<Run['provoke']['stage1']>['settings'][number];

export const SLOTS_24 = ['T_NAME', 'T_UNIT', 'T_CONSTRUCTS', 'T_RELATIONSHIPS', 'T_MODERATORS', 'T_SCOPE', 'T_TERMS_TO_EXCLUDE',
  'R', 'C_DIMENSION', 'C_SCALE', 'C_CONCEPTION', 'C_CONCEPTION_DEFINITION', 'C_TEXT', 'R_PRIME', 'M', 'DIMENSION_GUARD',
  'EXCLUDED_CAUSES', 'OBVIOUS_SETTINGS', 'C_SCENE_REQUIREMENT', 'DISTINCTION_TO_KEEP', 'WHAT_OF_R_REMAINS',
  'H1', 'H1_DESCRIPTION', 'H2', 'H2_DESCRIPTION', 'BASELINE_GROUP', 'MEASUREMENT', 'TABLE_A_SPEC', 'TABLE_B_SPEC',
  'TABLE_C_COLUMNS', 'TABLE_C_SPEC', 'PRIOR_EVIDENCE', 'TEMPORAL_FEATURE', 'PROPOSAL'] as const;

export const SLOTS_25: readonly string[] = (() => {
  const s: string[] = SLOTS_24.filter((n) => n !== 'DIMENSION_GUARD');
  s.splice(s.indexOf('H2_DESCRIPTION') + 1, 0, 'STYLE_MODEL');
  return s;
})();

export function slotsFor(version: TemplateVersion): readonly string[] {
  return version === '2.4' ? SLOTS_24 : SLOTS_25;
}

export function setupKeysFor(version: TemplateVersion): SetupKey[] {
  return version === '2.4' ? SETUP_KEYS.filter((k) => k !== 'n') : [...SETUP_KEYS];
}

export interface StaticTables {
  version: string;
  scales: { key: ScaleKey; label: string; description: string }[];
  dimensions: { key: DimKey; label: string; definition: string }[];
  cells: { dimension: DimKey; scale: ScaleKey; entry: string }[];
  conceptions: { n: number; name: string; definition: string }[];
  auditQuestions: Record<DimKey, string>;
  relationshipTerms: string[];
  admissibleChanges: string[];
  transformCriteria: string[];
  drawingRuleDefault: { individual: ScaleKey[]; note: string };
  setupRows: { key: SetupKey; label: string; since?: string; default?: string }[];
  templateVersions: { id: TemplateVersion; date: string; use: string }[];
}

export const STATIC = staticTablesJson as StaticTables;

/** Audit column order of Table 1 and of the audit editor. */
export const AUDIT_DIMS: DimKey[] = ['duration', 'sequence', 'rhythm', 'timing', 'speed', 'trajectory'];

export function dimLabel(d: DimKey): string {
  return STATIC.dimensions.find((x) => x.key === d)?.label ?? d;
}
