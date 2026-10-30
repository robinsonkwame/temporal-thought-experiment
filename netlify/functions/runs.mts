import { getStore } from '@netlify/blobs';
import { handleRuns } from '../lib/api.ts';

export default async (req: Request) => handleRuns(req, getStore({ name: 'tte-runs', consistency: 'strong' }));

export const config = { path: '/api/runs' };
