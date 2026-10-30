// The protocol export (brief, section 9). Filled in at milestone 5.
import type { Run } from './types';
export function buildProtocol(run: Run): string {
  return `# ${run.title}\n`;
}
