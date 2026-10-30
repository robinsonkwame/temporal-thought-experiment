import { describe, it, expect } from 'vitest';
import { fixture } from './helpers';
import { parseSlotReply, parseStage1, parseOpenings } from '../src/lib/parse';
import { parseBlock } from '../src/lib/block';
import { SLOTS_24, SLOTS_25 } from '../src/lib/types';

describe('slot reply parser', () => {
  it('parses the real reply of the paper run (version 2.4)', () => {
    const r = parseSlotReply(fixture('slot_reply_v2.4_utaut2.txt'), '2.4');
    if (r.status !== 'parsed') throw new Error('not parsed');
    expect(r.found).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.unknown).toEqual([]);
    expect(r.duplicates).toEqual([]);
    expect(Object.keys(r.slots)).toEqual([...SLOTS_24]);
    expect(r.slots.T_CONSTRUCTS.startsWith('Performance Expectancy (PE):')).toBe(true);
    expect(r.slots.R).toBe('the direct effect of Social Influence on Behavioural Intention.');
    expect(Object.keys(r.sources).length).toBe(34);
    expect(r.sources.R).toBe('copied from Table 6, row b');
  });

  for (const v of ['2.4', '2.5'] as const) {
    it(`parses the reference block ${v} wrapped in Markdown fences and bold`, () => {
      const ref = fixture(`reference_slot_values_v${v}.txt`);
      const wrapped = `Checks pass.\n\n\`\`\`\n${ref.replace(/^([A-Z][A-Z0-9_]*):/gm, '**$1:**')}\`\`\`\n\nSOURCES\nR: copied from Table 6, row b\nEND SOURCES\n`;
      const r = parseSlotReply(wrapped, v);
      if (r.status !== 'parsed') throw new Error('not parsed');
      expect(r.missing).toEqual([]);
      const expected = parseBlock(ref, v).values;
      for (const n of v === '2.4' ? SLOTS_24 : SLOTS_25) expect(r.slots[n]).toBe(expected[n].replace(/^\n/, '').trim());
      expect(r.sources.R).toBe('copied from Table 6, row b');
    });
  }

  it('recognises an INPUTS INCOMPLETE reply', () => {
    const text = '**INPUTS INCOMPLETE**\nTable 6, row g: empty.\n\nFill in the tables and send them again with this prompt.';
    const r = parseSlotReply(`\n\n${text}\n`, '2.5');
    expect(r.status).toBe('incomplete');
    if (r.status === 'incomplete') expect(r.text).toBe(text);
  });

  it('reports a missing slot, an unknown name and a duplicate', () => {
    const ref = fixture('reference_slot_values_v2.5.txt')
      .replace(/^PROPOSAL:.*$\n/m, '')
      .replace('END SLOT VALUES', 'DIMENSION_GUARD: an old slot\nH1: 2028\nEND SLOT VALUES');
    const r = parseSlotReply(ref, '2.5');
    if (r.status !== 'parsed') throw new Error('not parsed');
    expect(r.missing).toEqual(['PROPOSAL']);
    expect(r.unknown).toEqual(['DIMENSION_GUARD']);
    expect(r.duplicates).toEqual(['H1']);
  });
});

describe('stage 1 parser', () => {
  it('parses the five settings of the real reply (version 2.4, no Domain line)', () => {
    const text = fixture('stage1_reply_v2.4_utaut2.txt');
    const { settings, warnings } = parseStage1(text, '2.4');
    expect(warnings).toEqual([]);
    expect(settings.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    for (const s of settings) {
      expect(text).toContain(s.rawText);
      expect(s.rawText.startsWith(`${s.number}. `)).toBe(true);
      expect(s.fields.Domain).toBeUndefined();
      expect(s.fields.Tension).toBeTruthy();
    }
    expect(settings[0].fields.Setting.startsWith('Members of a shellfish-gathering cooperative')).toBe(true);
    expect(settings[0].fields['Nearest excluded cause'].startsWith('"users depending on one another')).toBe(true);
    expect(settings[0].rawText.endsWith(settings[0].fields.Tension)).toBe(true);
  });

  it('tolerates bold labels and warns about a missing setting and a missing Domain line', () => {
    const text = 'SETTINGS\n\n**1. A setting.**\n**Principles:** p\n**Domain:** d\nTension: t\n\n2. Another.\nPrinciples: q\nTension: u';
    const { settings, warnings } = parseStage1(text, '2.5');
    expect(settings.length).toBe(2);
    expect(settings[0].fields.Principles).toBe('p');
    expect(settings[0].fields.Domain).toBe('d');
    expect(warnings).toContain('Expected five settings; found 2.');
    expect(warnings.some((w) => w.startsWith('Setting 2 has no line:') && w.includes('Domain'))).toBe(true);
  });
});

describe('openings parser', () => {
  it('reads tags, untagged questions and the other-dimension mark', () => {
    const { openings, untagged } = parseOpenings('[N1.2] One?\n\n- [N2.1] Two? (other dimension)\n\nNo tag here?');
    expect(openings).toEqual([
      { tag: 'N1.2', text: 'One?', otherDimension: false },
      { tag: 'N2.1', text: 'Two? (other dimension)', otherDimension: true },
    ]);
    expect(untagged).toBe(1);
  });
});
