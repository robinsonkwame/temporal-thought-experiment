import { describe, it, expect } from 'vitest';
import { fixture } from './helpers';
import { parseSyntheticTables, impliedPaths, pathsForColumn, fmtCoef } from '../src/lib/paths';

describe('synthetic tables and implied paths', () => {
  const tables = parseSyntheticTables(fixture('stage2_reply_v2.4_utaut2.txt'));

  it('finds Tables A to C and keeps the raw text', () => {
    expect(tables.A!.rows.length).toBe(9);
    expect(tables.B!.header).toEqual(['Pair', 'Baseline', '2027', '2046', 'Notes']);
    expect(tables.B!.rows[0].slice(0, 4)).toEqual(['SI and EE', '.15', '.45', '.55']);
    expect(tables.C!.rows.length).toBe(2);
    expect(tables.B!.raw.startsWith('| Pair | Baseline |')).toBe(true);
  });

  it('reproduces the paper’s Table A6', () => {
    const r = impliedPaths(tables.B!, { xMed: 'SI and EE', xY: 'SI and BI', medY: 'EE and BI' });
    expect(r.columns.map((c) => c.label)).toEqual(['Baseline', '2027', '2046']);
    expect(r.columns.map((c) => fmtCoef(c.xToMed))).toEqual(['.15', '.45', '.55']);
    expect(r.columns.map((c) => fmtCoef(c.direct))).toEqual(['.36', '.30', '.19']);
    expect(r.columns.map((c) => fmtCoef(c.medToY))).toEqual(['.30', '.26', '.35']);
    expect(r.columns.map((c) => fmtCoef(c.indirect))).toEqual(['.04', '.12', '.19']);
    expect(r.columns.map((c) => fmtCoef(c.share))).toEqual(['.11', '.28', '.50']);
  });

  it('computes one column from the formulas', () => {
    expect(pathsForColumn(0.55, 0.38, 0.45)).toEqual({ xToMed: 0.55, direct: 0.19, medToY: 0.35, indirect: 0.19, share: 0.5 });
  });
});
