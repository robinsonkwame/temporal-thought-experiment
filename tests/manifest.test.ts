import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const manifest: Record<string, string> = JSON.parse(readFileSync(resolve(root, 'src/content/MANIFEST.sha256.json'), 'utf8'));

describe('provided content manifest', () => {
  it('lists the provided files', () => {
    expect(Object.keys(manifest).length).toBe(12);
  });
  for (const [path, hash] of Object.entries(manifest)) {
    it(`${path} is unchanged`, () => {
      const digest = createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
      expect(digest).toBe(hash);
    });
  }
});
