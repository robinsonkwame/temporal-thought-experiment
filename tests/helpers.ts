import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import exampleJson from '../src/content/example_utaut2.json';
import { zRun } from '../src/lib/schema';
import type { Run } from '../src/lib/types';

export const root = resolve(__dirname, '..');
export function fixture(name: string): string {
  return readFileSync(resolve(root, 'tests/fixtures', name), 'utf8');
}
export function example(): Run {
  return zRun.parse(structuredClone(exampleJson));
}
