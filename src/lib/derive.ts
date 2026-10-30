// Values shown on screen that a run may not hold yet, derived from its replies (for example, the example run).
import type { Run } from './types';
import { parseStage1 } from './parse';
import { parseBlock, slotText } from './block';
import { openingsOf } from './lint';

export function withDerived(run: Run): Run {
  const p = run.provoke;
  let out = run;
  const s1 = p.stage1;
  if (s1?.exchange.replyText && !s1.settings.length) {
    out = { ...out, provoke: { ...out.provoke, stage1: { ...s1, settings: parseStage1(s1.exchange.replyText, run.templateVersion).settings } } };
  }
  const slot = out.provoke.slot;
  if (slot?.confirmedBlock && !Object.keys(slot.parsed).length) {
    const { values } = parseBlock(slot.confirmedBlock, run.templateVersion);
    const parsed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, slotText(v)]));
    out = { ...out, provoke: { ...out.provoke, slot: { ...slot, parsed } } };
  }
  const s2 = out.provoke.stage2;
  const kept = s2?.drafts.find((d) => d.status === 'kept');
  if (s2 && kept?.replyText && s2.openings === undefined && run.templateVersion === '2.5') {
    out = { ...out, provoke: { ...out.provoke, stage2: { ...s2, openings: openingsOf(kept.replyText) } } };
  }
  return out;
}
