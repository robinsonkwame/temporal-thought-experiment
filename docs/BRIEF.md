# Build brief: Temporal Thought Experiment Workbench (Netlify)

Brief version 1.2, 30 October 2026. Prompt templates: version 2.4 (the run reported in the paper) and version 2.5 (default for new runs).

## 0. How to start

This folder (`repo_seed/`) is the start of the repository. Copy its contents into the root of an empty GitHub repository that is linked to a Netlify site, so that the repository holds `docs/BRIEF.md`, `src/content/` and `tests/fixtures/`. Commit them. Then tell Claude Code:

"Build the app specified in docs/BRIEF.md. The files in src/content and tests/fixtures are provided research instruments and data: never retype, regenerate or edit them. Work through the milestones in section 13 in order, commit after each, and stop to ask me only where the brief says to ask."

The provided files:

```
src/content/prompts/v2.4/01_slot_prompt.txt        prompt 1 as sent in the paper's run
src/content/prompts/v2.4/02_stage1.txt             prompt 2
src/content/prompts/v2.4/03_stage2.txt             prompt 3
src/content/prompts/v2.4/03_stage2_checklist.txt   the researcher's check list for prompt 3 (not part of the prompt)
src/content/prompts/v2.4/04_cutoff_check.txt       prompt 4
src/content/prompts/v2.5/...                       the same five files, version 2.5
src/content/static_tables.json                     the tables that are the same in every run
src/content/example_utaut2.json                    the paper's UTAUT2 run, tables and replies
src/content/MANIFEST.sha256.json                   SHA-256 of every file above
tests/fixtures/reference_slot_values_v2.4.txt      expected slot block for the example, version 2.4
tests/fixtures/reference_slot_values_v2.5.txt      the same with STYLE_MODEL, version 2.5
tests/fixtures/slot_reply_v2.4_utaut2.txt          the model's real reply to prompt 1 in the paper's run
tests/fixtures/stage1_reply_v2.4_utaut2.txt        the real reply to prompt 2
tests/fixtures/stage2_reply_v2.4_utaut2.txt        the real reply to prompt 3
```

## 1. What you are building and why

The app is a guided workbench, written like a storybook, for one method: the temporal thought experiment, published in an IS research paper for the EJIS special issue "Theorising Time in a Digital Era". A researcher takes an accepted theory in construct-relationship form, picks one temporal condition from a fixed list, varies one relationship of the theory under that condition, states the result as "under C, R becomes R′, through M", and then uses a language model to elaborate the statement into settings, accounts of a small society, synthetic survey tables and openings for research. The method has four phases: Select, Explore, Transform and Provoke.

The researcher records the first three phases in tables. Provoke then runs four prompts in the Claude app, each in a new conversation, with outputs carried from one to the next. By hand this is a long chain of copy and paste. The app walks the researcher through each table, checks the tables, assembles each prompt, takes the model's reply back, parses it, and assembles the next prompt. It records every table, pick, prompt, reply, choice, edit and time, and exports the protocol that the paper reports in its appendix. The paper (Appendix A.1.1, Table A2) presents the app as the instantiation of the method's traceability protocol and lists its fifteen steps; keep the step numbers of section 6.

Non-goals. The app does not call any language model API: the researcher runs each prompt in the Claude app, where the paper's documented settings apply. No accounts or login. The app never edits the prompt templates.

## 2. Ground rules for you (Claude Code)

1. The files in `src/content/` and `tests/fixtures/` are provided. Do not retype, regenerate, reformat or edit them. Import them as they are (Vite `?raw` imports for the `.txt` files, JSON imports for the `.json` files). A unit test computes the SHA-256 of each file and compares it with `MANIFEST.sha256.json`; the build fails if any differs.
2. The app inserts content into a prompt only at the exact placeholder strings of section 7.1. A unit test proves that every assembled prompt equals its template with only those placeholders replaced.
3. All user-facing copy in section 6 is given. Use it as written. Where you must add copy, write short, plain, declarative English: one instruction per sentence, no marketing language, no exclamation marks, no emoji.
4. Keep dependencies few. Ask before adding any dependency not named in section 3.
5. Write tests for the assembly, the parsers, the picks and the storage API before the screens that use them.
6. Commit after each milestone. Do not push secrets.

## 3. Stack and layout

Vite, React 18, TypeScript (strict), React Router. Plain CSS with custom properties (`src/styles.css`, CSS modules only where needed); no UI framework. Netlify Functions v2 (TypeScript, `.mts`) with `@netlify/blobs`. `zod` for validation, `nanoid` for identifiers, Vitest and Testing Library for tests. Node 20.

```
/
  netlify.toml
  package.json
  index.html
  docs/BRIEF.md                         provided
  src/
    main.tsx, App.tsx
    routes/       Home.tsx, RunEditor.tsx, Example.tsx, NotFound.tsx
    steps/        Step00Start.tsx ... Step14Protocol.tsx
    components/   Rail, StepFrame, PromptBox, PasteBack, TableEditor, PickPanel, Tag, Banner, ...
    lib/
      types.ts, schema.ts       section 4
      templates.ts              loads the provided prompts by version
      assemble.ts               section 7.1
      render-tables.ts          section 7.2
      block.ts                  section 7.3
      parse.ts                  section 8
      lint.ts                   section 8.4
      paths.ts                  section 8.5
      pick.ts                   section 6, step 3
      deps.ts                   section 6.0 (out-of-date marking)
      protocol.ts               section 9
      store.ts, cookie.ts       section 5
    content/                    provided
    styles.css
  netlify/functions/
    runs.mts     POST /api/runs
    run.mts      GET, PUT, DELETE /api/runs/:id
  tests/
    fixtures/                   provided
    *.test.ts
```

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Local development uses `netlify dev` so that functions and Blobs work.

## 4. Data model

One run is one JSON document. Mirror these types in zod and validate on every load and save. `src/content/example_utaut2.json` follows this model; read it before you write the schema, and make the schema accept it.

```ts
type TemplateVersion = '2.4' | '2.5';
type DimKey = 'speed' | 'duration' | 'sequence' | 'rhythm' | 'timing' | 'trajectory';
type ScaleKey = 'micro' | 'meso' | 'artefact' | 'macro';
type Answer = 'yes' | 'partly' | 'no';
type SetupKey = 'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j'|'k'|'l'|'m'|'n';   // 'n' from version 2.5

// Slot names in canonical order. Version 2.4 has 34. Version 2.5 has 34: it drops DIMENSION_GUARD and adds STYLE_MODEL after H2_DESCRIPTION.
const SLOTS_24 = ['T_NAME','T_UNIT','T_CONSTRUCTS','T_RELATIONSHIPS','T_MODERATORS','T_SCOPE','T_TERMS_TO_EXCLUDE',
  'R','C_DIMENSION','C_SCALE','C_CONCEPTION','C_CONCEPTION_DEFINITION','C_TEXT','R_PRIME','M','DIMENSION_GUARD',
  'EXCLUDED_CAUSES','OBVIOUS_SETTINGS','C_SCENE_REQUIREMENT','DISTINCTION_TO_KEEP','WHAT_OF_R_REMAINS',
  'H1','H1_DESCRIPTION','H2','H2_DESCRIPTION','BASELINE_GROUP','MEASUREMENT','TABLE_A_SPEC','TABLE_B_SPEC',
  'TABLE_C_COLUMNS','TABLE_C_SPEC','PRIOR_EVIDENCE','TEMPORAL_FEATURE','PROPOSAL'] as const;
// SLOTS_25 = SLOTS_24 without 'DIMENSION_GUARD', with 'STYLE_MODEL' inserted after 'H2_DESCRIPTION'.

interface Exchange { promptText: string; source?: string; copiedAt?: string; replyText?: string; pastedAt?: string }

interface Pick {
  kind: 'cell' | 'conception' | 'relationship' | 'change';
  value: string;                 // the words picked
  index?: number; of?: number;   // "k of n" in the numbered list
  how: 'random' | 'by hand';
  at: string;                    // ISO time
  reason: string;                // required for a re-pick and for a pick by hand; empty for a first random pick
}

interface Run {
  schema: 'tte-run/1';
  templateVersion: TemplateVersion;
  title: string; createdAt: string; updatedAt: string;
  readOnlyExample?: boolean; notes?: string[];
  theory: { name: string; source: string; unit: 'individual' | 'group' | 'organisation' | 'other'; unitNote: string };
  audit: { relationship: string; answers: Record<DimKey, { value: Answer; note: string }> }[];
  draw: {
    rule: string; scales: ScaleKey[]; ruleFixedAt?: string;
    picks: Pick[];               // every pick in order; the last pick of each kind is the current one
    cell: { dimension: DimKey; scale: ScaleKey; entry: string } | null;
    conception: { n: number; name: string } | null;
    relationship: string;
    cText: string; relationshipTerms: string[];
  };
  representation: { construct: string; role: string; relationships: string; moderators: string; scope: string; unstated: string }[];
  instances: { id: string; relationship: string; changeType: string; terms: string[]; description: string;
               screening: 'survives' | 'set aside'; reason: string }[];
  transform: { instanceId: string; cWords: string; candidateM: string;
               criteria: { value: 'yes' | 'no'; note: string }[];   // exactly four
               selected: boolean }[];
  setup: Partial<Record<SetupKey, string>>;
  provoke: {
    settings: { app: string; model: string; modelId: string; knowledgeCutoff: string; trainingDataTo: string;
                extendedThinking: boolean; memory: boolean; tools: boolean };
    slot?: { attempts: Exchange[]; status: 'incomplete' | 'parsed' | 'confirmed';
             parsed: Record<string, string>; sources: Record<string, string>;
             edits: { slot: string; before: string; after: string; at: string }[];
             confirmedBlock?: string; confirmedAt?: string };
    stage1?: { exchange: Exchange; settings: { number: number; rawText: string; fields: Record<string, string> }[];
               chosen?: number; reason?: string; chosenAt?: string };
    stage2?: { drafts: (Exchange & { status: 'pending' | 'kept' | 'discarded'; reason?: string; lint?: LintReport; checklist?: boolean[] })[];
               openings?: { tag: string; text: string; otherDimension: boolean }[];
               edits: { tag: string; before: string; after: string; rule: string; note: string; at: string }[];
               editsNote?: string; paths?: PathsResult };
    cutoff?: { exchange: Exchange };
  };
  stale?: string[];              // step ids marked out of date (section 6.0)
}
```

`LintReport` and `PathsResult` are defined in section 8. In the example, `promptText` is empty and `source` names the paper's appendix; the app regenerates the prompts from the tables when asked.

## 5. Saving, deleting and sharing

### 5.1 Storage

Runs are stored in Netlify Blobs, store name `tte-runs`, strong consistency. Key: the run id, a 21-character nanoid. Value: `{ run, editTokenHash, createdAt, updatedAt }`. The edit token is a 32-character nanoid held by the client; the server stores only its SHA-256 hash (Web Crypto).

### 5.2 API (Netlify Functions v2)

`netlify/functions/runs.mts`, `export const config = { path: '/api/runs' }`: POST `{ run }`. Validate with zod; reject bodies over 512 KB with 413. Create id and token, store, return `201 { id, editToken }`.

`netlify/functions/run.mts`, `export const config = { path: '/api/runs/:id' }` (read `context.params.id`): GET returns `200 { run, createdAt, updatedAt }` or 404, with no token needed. PUT with header `X-Edit-Token` and body `{ run }`: check the hash, validate, size limit, store, return `200 { updatedAt }`, or 403. DELETE with `X-Edit-Token`: check, delete, 204, or 403.

Use `getStore({ name: 'tte-runs', consistency: 'strong' })`, `store.setJSON`, `store.get(key, { type: 'json' })`, `store.delete`. Errors as JSON `{ error }`. `Cache-Control: no-store` on every API response.

### 5.3 The cookie: "My runs"

A cookie holds about 4 KB, and a run with its prompts and replies holds far more, so run content lives in Blobs and the cookie holds only the list of the researcher's runs. Cookie `tte_runs`: a base64url-encoded JSON array of `{ id, token, title, updatedAt }`, `Path=/`, `Max-Age=31536000`, `SameSite=Lax`, `Secure` on https. If the encoded cookie would exceed 3,800 bytes, drop the entries with the oldest `updatedAt` and show the "cookie full" notice.

Home lists the cookie's runs, newest first, with title, last saved time and the actions Open, Copy share link, Delete and Forget on this device. Delete asks "Delete this run for everyone who has the link? This cannot be undone.", calls DELETE and removes the cookie entry; on 404 it removes the entry silently. Forget removes only the cookie entry.

### 5.4 Editing, autosave, sharing, export

`/run/:id` loads the run. With a token for it in the cookie the editor is editable; otherwise it is read-only, with the banner "You are viewing a shared run. Make a copy to work on it." and a "Make a copy" button, which POSTs the run as "Copy of …", stores the new id and token, and opens it.

Autosave: PUT 1.5 seconds after the last change and on page hide. Header shows "Saved 14:32", "Saving…" or "Not saved: retrying" (exponential backoff). A new run is created (POST) on its first change.

Share: "Copy share link" copies `https://<site>/run/:id`, which never contains the token. Export on every run: "Download protocol (Markdown)" and "Download run (JSON)". Home: "Import run (JSON)", validated with zod, creates a new run.

Privacy notice in the footer: "Runs are stored on Netlify. Anyone with a run's link can read it. Your browser keeps the list of your runs and the keys to edit them in a cookie. Do not enter personal or confidential data."

### 5.5 The example

`/example/utaut2` opens `example_utaut2.json` read-only, with the banner "This is the worked run from the paper (prompt version 2.4). Make a copy to explore it, or to run Provoke again with version 2.5." Bundled with the app, never stored in Blobs. Its notes (`notes`) show under the banner. A copy keeps the tables and drops the Provoke replies, and asks which prompt version to use (default 2.5).

## 6. The storybook: navigation, screens, copy and checks

### 6.0 Navigation

Every step has Back and Next buttons, at the top and the bottom of the step. The rail (left on desktop, top on mobile) lists all fifteen steps by phase and lets the researcher open any step at any time. Nothing is blocked: a step with problems shows "needs attention" in the rail and lists the problems at its top. State per step: empty, in progress, complete, needs attention, out of date.

Changing an earlier step never deletes later work. It marks the later steps that depend on it "out of date", with the banner "An earlier step changed after this one was done. Check it, and copy any prompt again before you run it." Dependencies: any change in steps 0 to 7 marks steps 9 to 14 out of date; a change to the confirmed slot values marks 10 to 14; a change of the chosen setting marks 11, 12 and 14; a change to the style model (setup row n) marks 9 to 14; a new draw in step 3 also marks steps 4 to 7. The researcher clears the mark by opening the step and pressing "Mark as checked", which is logged.

Each step screen has the same parts: a heading with its tag (M for a model step, H for a researcher step, as in the paper's Figure 4), a "Why this step" line, a "What you do" paragraph, the work area, and the navigation.

### 6.1 The steps

Step 0. Start. Tag H.
Heading: "A temporal thought experiment".
Copy: "This workbench takes you through one run of the temporal thought experiment. You choose an accepted theory, pick one temporal condition from a fixed list, and vary one relationship of the theory under that condition. You then state the result in the form: under C, R becomes R′, through M. In the last phase, Provoke, a language model turns that statement into settings, two accounts of a small society, synthetic survey tables and questions for research. You run each prompt in the Claude app and paste the reply back here. The workbench records every table, pick, prompt, reply, choice and edit, and exports the protocol."
Fields: run title; theory name; full reference; unit of analysis (individual, group, organisation, other) and a note; prompt version (2.5, default; 2.4, "the version of the paper's run").
A toggle "Show the temporal list" shows the list from `static_tables.json` read-only.

SELECT

Step 1. The audit. Tag H.
Why: "The audit shows which temporal assumptions the theory states and which it leaves unstated. Only an unstated one can be picked."
What you do: "List every relationship of the theory, one per row, in a fixed order. For each of the six dimensions, answer the question shown in the column head: yes, partly or no. Add a short note where the theory states something."
Work area: a table editor; rows are relationships ("SI → BI"); six columns, each a three-way choice and a note; the column head shows the audit question from `static_tables.json`. Add, remove, reorder rows.
Checks: at least one relationship; every cell answered.

Step 2. The rule. Tag H.
Why: "You fix the rule before you pick, so that the condition cannot be fitted to the theory."
What you do: "Choose the scales that the theory's unit of analysis can register. For an individual-level theory the paper uses micro and meso. Then fix the rule."
Work area: scale checkboxes (an individual unit preselects micro and meso; other units start empty); the rule text, prefilled and editable: "Restrict the pick to the scales {list}; pick one cell at random among them, one conception of time, and one relationship among those whose audit answer on the picked dimension is 'no'; record each pick with its date." "Fix the rule" records `ruleFixedAt`. Editing a fixed rule asks for confirmation and is logged.

Step 3. The pick. Tag H.
Why: "A random pick keeps your preferences out of the choice of condition. Every pick is kept in the protocol."
Work area (`PickPanel`, three panels in order: cell, conception, relationship):
"Pick at random" chooses one item uniformly from the eligible list with `crypto.getRandomValues` (no seed). Eligible cells: the cells of the temporal list in the chosen scales, numbered row by row in the order of the list and, within a row, micro, meso, artefact, macro; shown as "Cell k of n". Conceptions: the ten of `static_tables.json`, "Conception k of 10". Relationships: the audit rows with "no" on the picked dimension, in audit order, "Relationship k of n"; this panel is enabled once a cell is picked.
"Pick again" is offered after a pick. It asks for a reason (select: "Outside what the theory's constructs can register"; "Same as an earlier run"; "Other", with text, required), then picks again at random. "Choose by hand" lets the researcher select an item directly, also with a required reason. Every pick is appended to `draw.picks` with its time; the current pick is the last of its kind. Show the history under each panel: "Pick 1, 09:12: Rhythm, cycle and entrainment; micro. Set aside: {reason}." Show, once any re-pick exists: "Re-picks are recorded. Report them with the run."
Then "C as written": prefill with the words of the picked cell, and ask: "Write C in the words of the cell, at its scale. You may add degree or detail, but not a new condition." Relationship terms: multi-select from `static_tables.json`.
Checks: one current pick of each kind; C contains the cell's words (case-insensitive, citations ignored); the relationship has "no" on the picked dimension.

EXPLORE

Step 4. The representation. Tag H.
Why: "With the theory laid out as a table, you can vary one relationship and hold every other one fixed."
What you do: "Enter each construct with its role, the relationships it enters with their signs, its moderators, the scope conditions the theory states, and the dimensions the audit leaves unstated for its relationships."
Work area: table editor with these six columns; "unstated" is computed from the audit and editable.
Checks: the picked relationship appears in some row.

Step 5. Candidate instances. Tag H.
Why: "Each instance changes one relationship in one way. With one change, a conflict can be traced to the condition."
What you do: "Write candidate changes to R. Screen each one: can it be described in the relationship terms, and could C bring it about? Keep a reason for every instance you set aside."
Work area: an optional "Pick changes at random" helper that picks k changes without replacement from the admissible changes (`static_tables.json`), logged as picks of kind "change". One card per instance: id (A, B, …), relationship (prefilled with R), change type (select from the admissible changes or free text), relationship terms (multi-select), one-line description, screening (survives or set aside), reason (required if set aside).
Checks: at least one survivor; every set-aside instance has a reason.

TRANSFORM

Step 6. Transform. Tag H.
Why: "Here you reason from each surviving change to the mechanism that the condition would have to produce. This is the human step."
What you do: "For each surviving instance, write the candidate mechanism M and judge it on the four criteria. Select one instance that passes all four."
Work area: one card per surviving instance: "C in the list's words" (prefilled "{dimension label}; {scale}: “{cell words without citations}”"), candidate M, four yes/no criteria with notes (texts from `static_tables.json`), selected (one only).
Checks: exactly one selected; it has four "yes".

Step 7. Provoke set-up. Tag H.
Why: "Provoke needs the statement in full and your choices for the model step. The model never makes these choices."
What you do: "Write the selected statement in full and set the horizons, the excluded causes, the familiar settings, the synthetic tables and the style of the accounts."
Fields, labels from `static_tables.json` `setupRows`, with help texts:
a "Each construct with its definition as the source states it, one per line, and the page."; b prefilled from the picked relationship; c R′ in full; d prefilled from the selected candidate M, to write in full; e "The year, and what the account shows, for example the first months of use."; f the same for the longer term; g "Causes that would produce R′ without C." with the candidates beside it (instances set aside for needing a construct outside the theory; mechanisms that failed the temporal check), each with an "Insert" link; h the settings in which the theory is usually tested and any an earlier run returned; i comparison group; j measurement; k distributions; l correlations; m subgroups; n (version 2.5 only) "Style model for the accounts", prefilled with the default from `static_tables.json` ("Ursula K. Le Guin, Always Coming Home (1985), in its ethnographic register"), editable, with "Reset to default". Help for n: "Name an author and a work whose prose the accounts follow. The prompt keeps its own rules: plain English, an observer who does not interpret, one first-person account, and no poems, myths or invented words."
Checks: all rows filled (a to m for 2.4; a to n for 2.5).

Step 8. Model settings. Tag H.
Copy: "Record the model and the settings you use in the Claude app. Use the same model for every prompt of this run."
Fields and defaults: app ("Claude application"), model ("Claude Opus 4.6"), identifier ("claude-opus-4-6"), knowledge cut-off ("May 2025"), training data to ("August 2025"), extended thinking (on), memory (off), tools (off).

PROVOKE

All prompt steps use two components. PromptBox: the assembled prompt, read-only, monospace, with its word count and a large "Copy prompt" button; the first copy records `copiedAt`; under it: "Open a new conversation in the Claude app, with the settings of step 8, and paste the prompt." PasteBack: a large textarea, "Paste the model's whole reply here", and "Use this reply", which records `pastedAt` and runs the parser. A prompt copied before an upstream change is marked out of date (section 6.0).

Step 9. The slot prompt. Tag M.
Why: "The slot prompt turns your tables into the slot values that the three Provoke prompts read."
Before the PromptBox, run the table check (section 8.1); list any problems with links to their steps, and allow copying with "The model will report these gaps too."
After the paste (section 8.2): if the reply begins "INPUTS INCOMPLETE", show the gaps and any blank tables the model returned, and "Fill in the tables and copy the prompt again." Keep the attempt. Otherwise show every slot as a labelled, editable text area with its source and a badge (copied, derived, missing); mark missing or empty slots. Compare R, C_TEXT, R_PRIME, M and (2.5) STYLE_MODEL with the tables (setup b, draw cText, setup c, setup d, setup n), whitespace normalised, and mark differences: "This value differs from your table." Log every edit.
"Confirm the slot values" (H) freezes `confirmedBlock` (section 7.3) and `confirmedAt`; "Unlock to edit" is logged.

Step 10. Stage 1: settings. Tag M.
Why: "The model proposes five settings in a small society where the condition could hold and the change could be seen."
PromptBox (prompt 2), PasteBack, parser (section 8.3), five cards with all fields. Under the cards: "Choose one setting for any reason, and write down why." Radio per card; reason required; "Use this setting" (H) records `chosen`, `reason`, `chosenAt`.

Step 11. Stage 2: accounts, tables and openings. Tag M.
Why: "The model writes two accounts of the chosen setting across its domain of applications, three synthetic tables, and questions that connect the pattern of time to the theory."
PromptBox (prompt 3), PasteBack (each paste is a draft). Show the lint report (section 8.4) and the check list from `03_stage2_checklist.txt` of the run's version, one checkbox per clause. "Keep this draft", or "Discard and generate again" (reason required; then "Open a new conversation and paste the same prompt again."). Exactly one draft may be kept. For version 2.5, show Part 3 as a list of questions, each linked to its paragraph; a question marked "(other dimension)" gets a button "Start a new run from this question", which copies the theory and the audit into a new run.

Step 12. Edit and log. Tag H.
Why: "You remove what falls outside the documented process and record each edit."
Show the kept draft by paragraph tag. Each paragraph has "Edit"; saving an edit requires a rule (select: "Construct outside the theory"; "Condition outside C"; "Excluded cause as reason for use or for M"; "Theoretical or TRIZ term"; "Summary of meaning or moral"; "Aligns the setting with IS use"; "Sharpens the link to the change from R to R′"; "Other") and a note. Model text and edited text side by side, with the count of edits. Show the synthetic tables (section 8.5) and the implied-paths calculator.

Step 13. Cut-off check. Tag M.
Why: "This records what the model knew at its training cut-off, for the comparison with work published later."
PromptBox (prompt 4), PasteBack; the reply is stored as is.

Step 14. Protocol. Tag H.
Copy: "Download the protocol for your paper's appendix. It holds every table, every pick, every prompt as sent, every reply as received, your choices with reasons, your edits and the times."
Buttons: Download protocol (Markdown), Download run (JSON), Copy share link.

Notices. Cookie full: "Your list of runs on this device is full. The oldest runs were removed from the list. They still exist at their links." Load error: "This run could not be loaded. Check the link, or it may have been deleted."

## 7. Prompt assembly (exact)

### 7.1 Placeholders

Load the template of the run's version. Replace only these exact strings, which are the same in versions 2.4 and 2.5:

Prompt 1, `<PASTE THE SIX TABLES HERE>`: the rendered tables (7.2).
Prompt 2, `<PASTE THE CONFIRMED SLOT VALUES BLOCK FROM MESSAGE 1 HERE, FROM "SLOT VALUES" TO "END SLOT VALUES">`: the confirmed block (7.3).
Prompt 3, the same placeholder: the confirmed block; and `<PASTE THE CHOSEN SETTING FROM THE STAGE 1 OUTPUT HERE, ALL ITS LINES FROM THE SETTING TO THE TENSION>`: the chosen setting's `rawText`, exactly as the model wrote it.
Prompt 4, `<PASTE THE LINES PRIOR_EVIDENCE, TEMPORAL_FEATURE AND PROPOSAL FROM THE CONFIRMED SLOT VALUES BLOCK HERE>`: the three lines `PRIOR_EVIDENCE: …`, `TEMPORAL_FEATURE: …`, `PROPOSAL: …`.

Never substitute the `{{NAME}}` markers inside the templates; the model reads them against the pasted block. The check lists are not part of any prompt.

### 7.2 Rendering the tables for prompt 1

Each table is a caption line, a blank line, and a GitHub-style pipe table; one blank line between tables. In cells, replace line breaks with `<br>` and `|` with `/`. No paper table numbers in the captions.

`Table 1. Audit`: Relationship | Duration | Sequence | Rhythm, cycle | Timing | Speed | Trajectory. Cell: "Yes", "Partly" or "No", plus " (note)" if a note exists.
`Table 2. Draw record`: Item | Record, rows: Theory and source ("{name} ({source})"); Unit of analysis; Rule, fixed before the audit; Cell picked ("Cell k of n. {dimension label}; {scale, lower case}: “{entry}”"); Conception of time picked ("Conception k of 10: {name, lower case}"); C as written; Relationship picked ("Relationship k of n: {relationship}"); Relationship terms; Picks (one line per pick: "{kind}, {how}, {date}: {value}{; set aside: reason}").
`Table 3. Representation`: Construct | Role | Hypothesised relationships | Moderators | Stated scope conditions | Dimensions the theory leaves unstated.
`Table 4. Candidate instances`: blank first header cell, then one column per surviving instance ("Instance A"); rows: Relationship varied; Change type; Relationship terms; One-line description; Screening. Under the table, one line: "Set aside: D, {description}: {reason}; E, …".
`Table 5. Transform`: blank first header cell, one column per surviving instance; rows: C, in the list's words; Candidate M; 1. M specific and interpretable; 2. R′ detectable; 3. Temporal check; 4. C in the list's words; Selected. Criterion cells: "Yes" or "No", plus ": note" if a note exists.
`Table 6. Provoke set-up`: Row | Entry, rows a to m (version 2.4) or a to n (version 2.5), labels from `setupRows`.

Golden test: render the example and check that every value of its tables appears in the output, that the six captions appear in order, and that prompt 1 assembled from it equals the template before and after the insertion point.

### 7.3 The confirmed block

```
SLOT VALUES
T_NAME: {value}
...
END SLOT VALUES
```

All slots of the run's version in canonical order (section 4), one per line as `NAME: value`; a multi-line value keeps its line breaks. Strip trailing whitespace. Test: parse each `reference_slot_values_*.txt` fixture and serialise it again; the result equals the fixture.

## 8. Checks, parsers and calculators

### 8.1 Table check (before prompt 1)

Mirror step 1 of the slot prompt: every field of steps 0 to 7 is filled; the picked cell is a cell of the list and C contains its words; the picked relationship has "no" on the picked dimension and appears in the representation; every change type is admissible or marked free text; exactly one instance is selected and it passes all four criteria; setup b contains the picked relationship; setup d contains the selected candidate M's first five words (warning only). Show each finding with its step.

### 8.2 Slot reply parser

Trim the reply. If its first non-empty line is `INPUTS INCOMPLETE`, return `{ status: 'incomplete', text }`. Otherwise find the lines `SLOT VALUES` and `END SLOT VALUES` (ignore surrounding whitespace, Markdown fences and bold markers). Between them, a line matching `^([A-Z][A-Z0-9_]*):\s*(.*)$` whose name is a slot of the run's version starts a slot; other lines continue the current slot. A value may begin on the line after its name (the real reply in `slot_reply_v2.4_utaut2.txt` does this for T_CONSTRUCTS): drop the empty first line. Parse `SOURCES` to `END SOURCES` the same way. Report missing, unknown and duplicate names. Show the raw reply beside the parsed fields. Test on the real reply fixture, on the reference fixtures wrapped in Markdown fences, on an "INPUTS INCOMPLETE" reply and on a reply with a missing slot.

### 8.3 Stage 1 parser

Find the line `SETTINGS`. Split the rest at lines matching `^\s*(\d+)\.\s+(.*)$`. For each setting keep `rawText` (from its number line to the line before the next number line, trimmed, exactly as written) and the labelled lines `Principles:`, `Society:`, `Domain:` (version 2.5), `Scope:`, `Condition:`, `Mechanism:`, `Measurement:`, `Nearest excluded cause:`, `Counter-example point:`, `Tension:`; a value runs to the next label. Tolerate Markdown bold around labels. Expect five settings; warn otherwise. Test on `stage1_reply_v2.4_utaut2.txt` (five settings, no Domain line).

### 8.4 Stage 2 lint

`LintReport = { accounts: { title: string; words: number; paragraphs: number; tags: string[] }[]; bannedTerms: { term: string; tag: string }[]; emDashes: { tag: string; count: number }[]; tagProblems: string[]; tablesFound: ('A'|'B'|'C')[]; closingSentence: boolean; openings?: { count: number; untagged: number; unknownTags: string[] } }`.
Split at `PART 1. ACCOUNTS`, `PART 2. SYNTHETIC SURVEY TABLES` and (2.5) `PART 3. OPENINGS FOR RESEARCH`; accounts at lines beginning `Account 1 (` and `Account 2 (`; paragraphs at tags `[N1.n]`, `[N2.n]`. Words 900 to 1,200 per account; paragraphs 8 to 12. Banned terms, whole word, case-insensitive, in Part 1 only, with the tag where found: the items of the confirmed T_TERMS_TO_EXCLUDE (parenthetical remarks such as "(as a term)" stripped), plus: theory, construct, variable, path, relationship, mediation, moderation, correlation, condition, mechanism, temporal, entrainment, dimension, scale, TRIZ, inventive, contradiction, principle, ideality, ideal final result, resource, segmentation, merging, inversion, intermediary, the other way round, another dimension, blessing in disguise, secondary problem. Flag, never reject: some words may be acceptable in plain use. Count "—" per paragraph. Check for the closing sentence that begins "Synthetic data generated by the language model". For Part 3: four to six questions; each begins with a tag that exists in Part 1. Test on `stage2_reply_v2.4_utaut2.txt` (version 2.4, no Part 3; accounts of about 1,240 and 1,450 words, which the lint reports as over the range).

### 8.5 Synthetic tables and implied paths

Parse each Markdown table that follows a line containing "Table A", "Table B" or "Table C"; keep the raw text. Implied-paths calculator: the researcher picks from Table B the rows holding X–Med, X–Y and Med–Y (example: "SI and EE", "SI and BI", "EE and BI"). Per column, with a = r(X,Med), c = r(X,Y), b0 = r(Med,Y): X → Med = a; direct X → Y = (c − a·b0)/(1 − a²); Med → Y = (b0 − a·c)/(1 − a²); indirect = a × (Med → Y); share = indirect/(indirect + direct). Two decimals. Test with the example's correlations (.15, .40, .35 at baseline; .45, .42, .40 in 2027; .55, .38, .45 in 2046): direct .36, .30, .19; Med → Y .30, .26, .35; indirect .04, .12, .19; share .11, .28, .50 (as in the paper's Table A6).

## 9. Protocol export

Markdown, with headings: title, prompt version and times; theory; the six tables as rendered for prompt 1, including the pick history; model settings; for each prompt (slot attempts, stage 1, each stage 2 draft, cut-off check) "Prompt as sent (copied {time})" and "Reply as received (pasted {time})" in fenced blocks; the confirmed slot block and its edits; the chosen setting with reason and time; the drafts with status and reasons; the lint report and the ticked check list; the openings; the edit log as a table (tag, rule, note, before, after); model and edited accounts side by side; Tables A to C and the paths; the cut-off reply; the "Mark as checked" log. End with the template version and the app version. The JSON export is the run document.

## 10. Visual design

Minimal and clear, in the style of the paper's figures: black ink on white, one grey for secondary text and lines, a light grey fill for researcher (H) steps, one accent for focus and the primary button, no other colour.

Tokens on `:root`: `--ink: #1a1a1a; --grey: #6b6b6b; --line: #d0d0d0; --fill: #f2f2f2; --paper: #ffffff; --accent: #1f4e8c; --warn: #8a5a00; --error: #a32020; --radius: 6px; --gap: 16px;` and a dark scheme under `@media (prefers-color-scheme: dark)`: `--ink: #ececec; --grey: #a0a0a0; --line: #3a3a3a; --fill: #222; --paper: #121212; --accent: #8fb3e8`. System font stack for text; `ui-monospace, SFMono-Regular, Menlo, monospace` for prompts. Body 16px, line height 1.55, copy at most 72 characters wide, content up to 980px. M steps have a 1.6px border, H steps a light fill, as in Figure 4. Tags "M" and "H" are small bold italic letters at the top right of a step heading. Primary buttons filled with `--accent`, secondary outlined; focus ring 2px `--accent`. No shadows, no gradients, fades of 150 ms at most. Works at 360px width with no horizontal page scroll; wide tables scroll inside their own container.

## 11. Accessibility

Every control has a visible label. All actions work from the keyboard; Copy buttons announce "Copied" through an `aria-live` region. Colour is never the only signal: badges and states carry words. Contrast at least 4.5:1. The rail is a `nav` with `aria-current="step"`.

## 12. Tests and acceptance criteria

Unit tests: the manifest check (section 2); assembly of all four prompts in both versions; the table rendering golden test; the slot parser on the fixtures (8.2); the block round trip (7.3); the stage 1 parser (8.3); the lint (8.4), plus a fixture you write with a Part 3; the pick (uniform choice over the eligible list, numbering order, re-pick needs a reason, every pick kept); out-of-date marking (6.0); the paths calculator (8.5); cookie encode, decode and size cap; the API with an in-memory Blobs mock (create, read, update with right and wrong token, delete).

Acceptance on a Netlify deploy preview:
1. Open the example; every step shows the paper's tables and replies; make a copy with version 2.5 and reach step 9 without editing; the table check passes.
2. Prompt 1 from step 9, run in the Claude app, gives a reply whose parsed slots match `reference_slot_values_v2.5.txt` apart from wording in the derived slots.
3. Confirm, run stages 1 and 2 and the cut-off check by copy and paste only; the protocol downloads with every prompt, reply and time.
4. In step 3, "Pick again" without a reason is impossible; the protocol lists every pick.
5. Back and Next work on every step; changing step 1 after step 11 marks steps 9 to 14 out of date and deletes nothing.
6. The share link opens read-only in a private window; "Make a copy" works there. Delete removes the run for everyone; the link then shows the load error. A reload loses nothing shown as saved.

## 13. Milestones

1. Scaffold; import the provided content; manifest test; types and schemas; assembly, rendering and block, with tests.
2. Parsers, lint, picks, out-of-date marking, paths, with tests.
3. Functions, Blobs, cookie, store client, with tests.
4. Steps 0 to 8 with navigation and checks.
5. Steps 9 to 14 and the protocol export; the example end to end.
6. Design pass, accessibility pass, acceptance on a deploy preview. Report anything in this brief that you could not do as written.

Ask me before you change a provided file, add a dependency, change the storage design, or drop a feature.
