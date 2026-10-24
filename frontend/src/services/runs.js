import { backendContract } from './backendContract.js';
import { createHttp } from './http.js';
import { validateRun } from './viewModel.js';
import { fetchSourcePdf } from './source.js';
export function createRunsApi({ getAccessToken, contract = backendContract, fetchImpl }) {
  const request = createHttp({ getAccessToken, fetchImpl });
  function ready(key) {
    if (!contract.confirmed || !contract[key]) throw new Error('Live run integration is waiting for the backend contract. Use the labeled demo workspace to preview this flow.');
  }
  return {
    mode: 'live',
    async createRun(files, _scenario, { signal } = {}) {
      ready('decodeRun'); const form = new FormData();
      files.forEach(file => form.append(contract.uploadField, file));
      return validateRun(contract.decodeRun(await request(contract.createPath, { method: 'POST', body: form, signal })));
    },
    async getRun(id, { signal } = {}) { ready('detailPath'); ready('decodeRun'); return validateRun(contract.decodeRun(await request(contract.detailPath(id), { signal }))); },
    async listRuns({ signal } = {}) { ready('historyPath'); ready('decodeHistory'); const runs = contract.decodeHistory(await request(contract.historyPath, { signal })); if (!Array.isArray(runs)) throw new Error('History response mapping is incomplete.'); return runs.map(validateRun); },
    async saveReview(id, findingId, review, { signal } = {}) {
      ready('reviewPath'); ready('encodeReview'); ready('decodeReview');
      return contract.decodeReview(await request(contract.reviewPath(id, findingId), { method: 'PATCH', body: contract.encodeReview(review), signal }));
    },
    async getSource(id, documentId, { signal } = {}) {
      if (!contract.sourceConfirmed || !contract.sourcePath) throw new Error('Source document integration is not configured.');
      return fetchSourcePdf(request, documentId, { path: contract.sourcePath(id, documentId), signal, fetchImpl });
    },
  };
}
