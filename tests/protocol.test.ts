import { describe, it, expect } from 'vitest';
import { example, fixture } from './helpers';
import { buildProtocol, fence } from '../src/lib/protocol';
import { withDerived } from '../src/lib/derive';
import { copyExample } from '../src/lib/run';
import { assembleSlotPrompt } from '../src/lib/assemble';
import { markStale, markChecked } from '../src/lib/deps';

describe('protocol export', () => {
  it('holds the tables, every reply, the choices, the edits and the versions for the example', () => {
    const run = withDerived(example());
    const md = buildProtocol(run);
    for (const h of ['## Theory', '## Tables', '## Model settings', '## Prompts and replies', '## Confirmed slot values', '## Chosen setting',
      '## Stage 2 drafts', '## Edit log', '## Accounts: model text and edited text', '## Synthetic tables', '## Cut-off check', '## Log']) {
      expect(md).toContain(h);
    }
    expect(md).toContain('Table 2. Draw record');
    expect(md).toContain(run.provoke.stage1!.exchange.replyText!.slice(0, 200));
    expect(md).toContain(fixture('stage2_reply_v2.4_utaut2.txt').slice(0, 200));
    expect(md).toContain('Prompt as sent: Appendix A.1 of the paper');
    expect(md).toContain('Setting 1, chosen 2026-10-29. Reason: the tide');
    expect(md).toContain('| Baseline | 2027 | 2046 |');
    expect(md).toMatch(/Prompt template version 2\.4 \(29 October 2026\)\. Workbench version \d+\.\d+\.\d+\./);
  });

  it('records each prompt as sent with its copy time, and the mark-as-checked log', () => {
    let run = copyExample(example(), '2.5');
    run.provoke.slot = { attempts: [{ promptText: assembleSlotPrompt(run), copiedAt: '2026-10-30T09:00:00Z', replyText: 'INPUTS INCOMPLETE\nx', pastedAt: '2026-10-30T09:05:00Z' }],
      status: 'incomplete', parsed: {}, sources: {}, edits: [] };
    run = markChecked(markStale(run, 1), 9, '2026-10-30T10:00:00Z');
    const md = buildProtocol(run);
    expect(md).toContain('Prompt as sent (copied 2026-10-30T09:00:00Z)');
    expect(md).toContain('Reply as received (pasted 2026-10-30T09:05:00Z)');
    expect(md).toContain('| 2026-10-30T10:00:00Z | 9 | Marked as checked |  |');
    expect(md).toContain('## Openings for research');
  });

  it('fences text that holds backticks', () => {
    expect(fence('a\n```\nb')).toBe('````text\na\n```\nb\n````');
  });
});
