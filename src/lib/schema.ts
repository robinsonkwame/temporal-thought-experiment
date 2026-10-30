// Zod mirror of the run document (brief, section 4). Validated on every load and save.
import { z } from 'zod';

export const TEMPLATE_VERSIONS = ['2.4', '2.5'] as const;
export const DIM_KEYS = ['speed', 'duration', 'sequence', 'rhythm', 'timing', 'trajectory'] as const;
export const SCALE_KEYS = ['micro', 'meso', 'artefact', 'macro'] as const;
export const SETUP_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'] as const;

export const zTemplateVersion = z.enum(TEMPLATE_VERSIONS);
export const zDimKey = z.enum(DIM_KEYS);
export const zScaleKey = z.enum(SCALE_KEYS);
// '' is an unanswered cell: the editor must be able to hold a row before every cell is answered.
export const zAnswer = z.enum(['yes', 'partly', 'no', '']);

export const zExchange = z.object({
  promptText: z.string(),
  source: z.string().optional(),
  copiedAt: z.string().optional(),
  replyText: z.string().optional(),
  pastedAt: z.string().optional(),
});

export const zPick = z.object({
  kind: z.enum(['cell', 'conception', 'relationship', 'change']),
  value: z.string(),
  index: z.number().int().optional(),
  of: z.number().int().optional(),
  how: z.enum(['random', 'by hand']),
  at: z.string(),
  reason: z.string(),
});

export const zLintReport = z.object({
  accounts: z.array(z.object({ title: z.string(), words: z.number(), paragraphs: z.number(), tags: z.array(z.string()) })),
  bannedTerms: z.array(z.object({ term: z.string(), tag: z.string() })),
  emDashes: z.array(z.object({ tag: z.string(), count: z.number() })),
  tagProblems: z.array(z.string()),
  tablesFound: z.array(z.enum(['A', 'B', 'C'])),
  closingSentence: z.boolean(),
  openings: z.object({ count: z.number(), untagged: z.number(), unknownTags: z.array(z.string()) }).optional(),
});

const zPathsColumn = z.object({
  label: z.string(),
  a: z.number(), c: z.number(), b0: z.number(),
  xToMed: z.number(), direct: z.number(), medToY: z.number(), indirect: z.number(), share: z.number(),
});

export const zPathsResult = z.object({
  xMed: z.string(),
  xY: z.string(),
  medY: z.string(),
  columns: z.array(zPathsColumn),
});

const zDraft = zExchange.extend({
  status: z.enum(['pending', 'kept', 'discarded']),
  reason: z.string().optional(),
  lint: zLintReport.optional(),
  checklist: z.array(z.boolean()).optional(),
});

const zSetting = z.object({ number: z.number(), rawText: z.string(), fields: z.record(z.string()) });

export const zLogEntry = z.object({ at: z.string(), step: z.number().int(), action: z.string(), detail: z.string().optional() });

export const zRun = z.object({
  schema: z.literal('tte-run/1'),
  templateVersion: zTemplateVersion,
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  readOnlyExample: z.boolean().optional(),
  notes: z.array(z.string()).optional(),
  theory: z.object({
    name: z.string(),
    source: z.string(),
    unit: z.enum(['individual', 'group', 'organisation', 'other']),
    unitNote: z.string(),
  }),
  audit: z.array(z.object({
    relationship: z.string(),
    answers: z.object(Object.fromEntries(DIM_KEYS.map((k) => [k, z.object({ value: zAnswer, note: z.string() })])) as
      Record<(typeof DIM_KEYS)[number], z.ZodObject<{ value: typeof zAnswer; note: z.ZodString }>>),
  })),
  draw: z.object({
    rule: z.string(),
    scales: z.array(zScaleKey),
    ruleFixedAt: z.string().optional(),
    picks: z.array(zPick),
    cell: z.object({ dimension: zDimKey, scale: zScaleKey, entry: z.string() }).nullable(),
    conception: z.object({ n: z.number().int(), name: z.string() }).nullable(),
    relationship: z.string(),
    cText: z.string(),
    relationshipTerms: z.array(z.string()),
  }),
  representation: z.array(z.object({
    construct: z.string(), role: z.string(), relationships: z.string(),
    moderators: z.string(), scope: z.string(), unstated: z.string(),
  })),
  instances: z.array(z.object({
    id: z.string(), relationship: z.string(), changeType: z.string(), terms: z.array(z.string()),
    description: z.string(), screening: z.enum(['survives', 'set aside']), reason: z.string(),
  })),
  transform: z.array(z.object({
    instanceId: z.string(), cWords: z.string(), candidateM: z.string(),
    criteria: z.array(z.object({ value: z.enum(['yes', 'no', '']), note: z.string() })).length(4),
    selected: z.boolean(),
  })),
  setup: z.object(Object.fromEntries(SETUP_KEYS.map((k) => [k, z.string().optional()])) as
    Record<(typeof SETUP_KEYS)[number], z.ZodOptional<z.ZodString>>),
  provoke: z.object({
    settings: z.object({
      app: z.string(), model: z.string(), modelId: z.string(), knowledgeCutoff: z.string(), trainingDataTo: z.string(),
      extendedThinking: z.boolean(), memory: z.boolean(), tools: z.boolean(),
    }),
    slot: z.object({
      attempts: z.array(zExchange),
      status: z.enum(['incomplete', 'parsed', 'confirmed']),
      parsed: z.record(z.string()),
      sources: z.record(z.string()),
      edits: z.array(z.object({ slot: z.string(), before: z.string(), after: z.string(), at: z.string() })),
      confirmedBlock: z.string().optional(),
      confirmedAt: z.string().optional(),
    }).optional(),
    stage1: z.object({
      exchange: zExchange,
      settings: z.array(zSetting),
      chosen: z.number().optional(),
      reason: z.string().optional(),
      chosenAt: z.string().optional(),
    }).optional(),
    stage2: z.object({
      drafts: z.array(zDraft),
      openings: z.array(z.object({ tag: z.string(), text: z.string(), otherDimension: z.boolean() })).optional(),
      edits: z.array(z.object({ tag: z.string(), before: z.string(), after: z.string(), rule: z.string(), note: z.string(), at: z.string() })),
      editsNote: z.string().optional(),
      paths: zPathsResult.optional(),
    }).optional(),
    cutoff: z.object({ exchange: zExchange }).optional(),
  }),
  stale: z.array(z.string()).optional(),
  // Not in the brief's model: the log of "Mark as checked", rule changes after fixing, slot unlocks and draft choices.
  log: z.array(zLogEntry).optional(),
});

export const MAX_RUN_BYTES = 512 * 1024;
