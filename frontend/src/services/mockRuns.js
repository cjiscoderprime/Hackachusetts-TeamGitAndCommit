import flawed from '../mocks/flawed.json' with { type: 'json' };
import corrected from '../mocks/corrected.json' with { type: 'json' };
import { makeDemoPdf, demoDocumentLines } from './pdf.js';
// These states and properties are a local UI fixture model, NOT the agreed FastAPI schema.
export function createMockRunsApi({ now = () => Date.now(), id = () => crypto.randomUUID() } = {}) {
  const store = new Map();
  const clone = x => structuredClone(x);
  function requireRun(key) { if (!store.has(key)) throw new Error('This demo run is no longer available.'); return store.get(key); }
  function snapshot(entry) {
    const run = clone(entry.run), elapsed = now() - entry.started;
    if (elapsed >= 3500) {
      run.status = entry.scenario === 'failure' ? 'failed' : 'completed'; run.terminal = true; run.updatedAt = new Date(entry.started + 3500).toISOString();
      if (run.status === 'completed') { run.completedAt = run.updatedAt; run.result = clone(entry.result); run.method = 'Deterministic fixture · no live analysis'; run.fallback = false; }
      else run.documentErrors = [{ documentId: run.documents[0].id, filename: run.documents[0].filename, message: 'Illustrative error: text could not be extracted from this PDF.' }];
    } else if (elapsed >= 350) { run.status = 'processing'; run.updatedAt = new Date(entry.started + 350).toISOString(); }
    return run;
  }
  return {
    mode: 'mock',
    async createRun(files, scenario = 'flawed') {
      const started = now(), runId = id();
      const result = clone(scenario === 'corrected' ? corrected : flawed);
      result.documents_analyzed = files.length;
      result.findings.forEach(f => f.sources.forEach(s => { s.filename = s.filename.replace(/\.txt$/i, '.pdf'); }));
      const run = { id: runId, status: 'queued', terminal: false, createdAt: new Date(started).toISOString(), updatedAt: new Date(started).toISOString(), documents: files.map((f, i) => ({ id: `${runId}-document-${i}`, filename: f.name })), documentErrors: [], result: null, reviews: {}, demo: true };
      store.set(runId, { started, scenario, run, result }); return snapshot(requireRun(runId));
    },
    async getRun(runId) { return snapshot(requireRun(runId)); },
    async listRuns() { return [...store.values()].reverse().map(snapshot); },
    async saveReview(runId, findingId, review) {
      const entry = requireRun(runId);
      if (!snapshot(entry).result?.findings.some(f => f.id === findingId)) throw new Error('Finding not found in this demo run.');
      if (!['unreviewed', 'reviewed', 'needs_clarification'].includes(review.status)) throw new Error('Unsupported review status.');
      entry.run.reviews[findingId] = clone(review); return clone(review);
    },
    async getSource(runId, documentId) {
      const entry = requireRun(runId), document = entry.run.documents.find(d => d.id === documentId);
      if (!document) throw new Error('Source not found in this demo run.');
      const lines = demoDocumentLines[document.filename];
      if (!lines) throw new Error('No fixture source matches this filename. Demo mode does not analyze uploaded PDF contents.');
      let actual = [...lines];
      if (entry.scenario === 'corrected' && document.filename === 'scientific-summary.pdf') actual = [lines[0], lines[1], lines[2].replace('0.81', '0.91'), 'Performance has only been evaluated internally.', 'Limitations: no external evaluation.'];
      return makeDemoPdf(actual);
    },
    clear() { store.clear(); },
  };
}
