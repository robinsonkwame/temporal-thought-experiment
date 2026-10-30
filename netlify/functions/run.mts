import { getStore } from '@netlify/blobs';
import { handleRun } from '../lib/api.ts';

export default async (req: Request, context: { params: Record<string, string> }) =>
  handleRun(req, getStore({ name: 'tte-runs', consistency: 'strong' }), context.params.id);

export const config = { path: '/api/runs/:id' };
