import { validateResponse } from '../api.js';
// Checks INTERNAL normalized data after the backend's agreed decoder has run.
export function validateRun(run) {
  if (!run || typeof run.id !== 'string' || !run.id || typeof run.status !== 'string' || typeof run.terminal !== 'boolean' || !Array.isArray(run.documents) || run.documents.some(d=>!d || typeof d.id!=='string' || typeof d.filename!=='string') || !Array.isArray(run.documentErrors) || run.documentErrors.some(e=>!e || typeof e.message!=='string') || (run.reviews != null && (typeof run.reviews!=='object' || Array.isArray(run.reviews)))) throw new Error('Run response mapping is incomplete. Check the agreed backend contract.');
  if (run.result != null && (validateResponse(run.result).status !== 'completed' || !run.terminal)) throw new Error('A completed report requires a terminal run.');
  return run;
}
