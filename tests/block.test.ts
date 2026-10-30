import { describe, it, expect } from 'vitest';
import { fixture, example } from './helpers';
import { parseBlock, serializeBlock } from '../src/lib/block';

describe('confirmed block round trip', () => {
  for (const v of ['2.4', '2.5'] as const) {
    it(`reference_slot_values_v${v}.txt parses and serialises to itself`, () => {
      const text = fixture(`reference_slot_values_v${v}.txt`);
      const parsed = parseBlock(text, v);
      expect(parsed.unknown).toEqual([]);
      expect(parsed.duplicates).toEqual([]);
      expect(Object.keys(parsed.values).length).toBe(34);
      // The fixture file ends with a line break; the block itself does not.
      expect(serializeBlock(parsed.values, v)).toBe(text.replace(/\n$/, ''));
    });
  }
  it('round-trips the example confirmed block', () => {
    const block = example().provoke.slot!.confirmedBlock!;
    expect(serializeBlock(parseBlock(block, '2.4').values, '2.4')).toBe(block);
  });
  it('writes empty slots and strips trailing whitespace', () => {
    const b = serializeBlock({ T_NAME: 'X  ', R: 'a\nb ' }, '2.5');
    expect(b.split('\n')[1]).toBe('T_NAME: X');
    expect(b).toContain('T_UNIT:\n');
    expect(b).toContain('R: a\nb\n');
  });
});
