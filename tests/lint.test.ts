import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fixture, root } from './helpers';
import { lintStage2, excludedTerms, lintFindings, openingsOf } from '../src/lib/lint';

const TERMS = 'Performance Expectancy, Effort Expectancy, Social Influence, Facilitating Conditions, Hedonic Motivation, Price Value, Habit, Behavioural Intention, Use, UTAUT2';

describe('stage 2 lint', () => {
  it('lints the real stage 2 reply (version 2.4)', () => {
    const r = lintStage2(fixture('stage2_reply_v2.4_utaut2.txt'), { termsToExclude: TERMS, expectPart3: false });
    expect(r.accounts.map((a) => a.title)).toEqual(['Low Water, First Months', 'The Beds They Know']);
    expect(r.accounts.map((a) => a.paragraphs)).toEqual([10, 11]);
    // About 1,240 and 1,450 words: over the range of 900 to 1,200.
    expect(Math.abs(r.accounts[0].words - 1240)).toBeLessThan(40);
    expect(Math.abs(r.accounts[1].words - 1450)).toBeLessThan(40);
    expect(r.tagProblems).toEqual([]);
    expect(r.tablesFound).toEqual(['A', 'B', 'C']);
    expect(r.closingSentence).toBe(true);
    expect(r.openings).toBeUndefined();
    const f = lintFindings(r);
    expect(f.some((x) => x.startsWith('Account 1 has') && x.includes('900 to 1,200'))).toBe(true);
    expect(f.some((x) => x.startsWith('Account 2 has') && x.includes('900 to 1,200'))).toBe(true);
  });

  it('flags banned terms by tag, em dashes, and Part 3 problems', () => {
    const text = readFileSync(resolve(root, 'tests/own-fixtures/stage2_reply_v2.5_part3.txt'), 'utf8');
    const r = lintStage2(text, { termsToExclude: TERMS, expectPart3: true });
    expect(r.accounts.map((a) => a.tags)).toEqual([['N1.1', 'N1.2', 'N1.3'], ['N2.1', 'N2.2']]);
    expect(r.bannedTerms).toContainEqual({ term: 'theory', tag: 'N1.2' });
    // Whole words only: "harbour" and "logs" do not match; Part 2 and Part 3 are not searched.
    expect(r.bannedTerms.filter((b) => b.term === 'Use')).toEqual([]);
    expect(r.emDashes).toEqual([{ tag: 'N1.3', count: 2 }]);
    expect(r.tablesFound).toEqual(['A', 'B', 'C']);
    expect(r.closingSentence).toBe(true);
    expect(r.openings).toEqual({ count: 4, untagged: 1, unknownTags: ['N1.9'] });
    const open = openingsOf(text);
    expect(open[3].otherDimension).toBe(true);
    expect(open[0].otherDimension).toBe(false);
  });

  it('strips parenthetical remarks from excluded terms', () => {
    expect(excludedTerms('Habit, relationship (as a term); Use.')).toEqual(['Habit', 'relationship', 'Use']);
  });

  it('reports tag problems', () => {
    const r = lintStage2('PART 1. ACCOUNTS\nAccount 1 (2027): T\nIntro\n[N1.1] a\n[N1.3] b\nAccount 2 (2046): U\n[N1.1] c', { expectPart3: false });
    expect(r.tagProblems).toEqual([
      'Account 1: tag [N1.3] where [N1.2] was expected.',
      'Account 1: text before the first tag.',
      'Account 2: tag [N1.1] where [N2.1] was expected.',
      'Tag [N1.1] appears more than once.',
    ]);
  });
});
