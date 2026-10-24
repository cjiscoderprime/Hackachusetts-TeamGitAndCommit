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
    ready('decodeRun');
    ready('detailPath');

    const form = new FormData();

    files.forEach(file => {
      form.append(contract.uploadField, file);
    });

    // Create the analysis run.
    const created = await request(contract.createPath, {
      method: 'POST',
      body: form,
      signal
    });

    if (!created?.id) {
      throw new Error('Backend did not return a run ID.');
    }

    // Retrieve the complete run from FastAPI.
    const raw = await request(contract.detailPath(created.id), {
      signal
    });

    return validateRun(contract.decodeRun(raw));
  },

        
    async getRun(id, { signal } = {}) {
      ready('detailPath');
      ready('decodeRun');

      const raw = await request(contract.detailPath(id), {
        signal
      });

      const run = validateRun(contract.decodeRun(raw));

      // Only retrieve reviews for completed reports.
      if (!run.terminal || !run.result?.findings?.length) {
        return run;
      }

      const reviews = {};

      await Promise.all(
        run.result.findings.map(async finding => {
          if (!finding.id) return;

          const path = contract.reviewPath(
            id,
            finding.id
          );

          const saved = await request(path, { signal });

          reviews[finding.id] =
            contract.decodeReview(saved);
        })
      );

      return validateRun({
        ...run,
        reviews
      });
    },


    async listRuns({ signal } = {}) {
      ready('historyPath');
      ready('detailPath');
      ready('decodeRun');

      const summaries = await request(contract.historyPath, {
        signal
      });

      if (!Array.isArray(summaries)) {
        throw new Error('Invalid run history response');
      }

      const runs = await Promise.all(
        summaries.map(async summary => {
          const fullRun = await request(
            contract.detailPath(summary.id),
            { signal }
          );

          return validateRun(contract.decodeRun(fullRun));
        })
      );

      return runs;
    },
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
