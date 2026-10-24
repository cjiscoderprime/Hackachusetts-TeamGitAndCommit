/*
 * INTEGRATION BOUNDARY — awaiting teammate confirmation.
 * The names/statuses used by the UI mock are INTERNAL VIEW MODELS, not a wire contract.
 * Implement these mappings from the agreed FastAPI schemas, then set confirmed=true.
 * No speculative list/detail/review endpoint is called before that.
 */
export const backendContract = {
  confirmed: false,
  uploadField: 'files', // inherited field name; reconfirm for POST /runs
  createPath: '/runs', // confirmed by backend teammate
  detailPath: null, // function(runId) => agreed relative path
  historyPath: null,
  reviewPath: null, // function(runId, findingId) => agreed relative path
  sourceConfirmed: true,
  sourcePath: (_runId, documentId) => `/documents/${encodeURIComponent(documentId)}/source`, // confirmed signed-URL grant endpoint
  decodeRun: null, // raw response => internal Run view model (see CONTRACT-PENDING.md)
  decodeHistory: null, // raw response => Run[]
  encodeReview: null, // internal Review => agreed request body
  decodeReview: null, // response => internal Review (or handle agreed 204 explicitly)
};
