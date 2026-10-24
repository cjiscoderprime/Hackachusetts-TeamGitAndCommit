/*
 * INTEGRATION BOUNDARY — awaiting teammate confirmation.
 * The names/statuses used by the UI mock are INTERNAL VIEW MODELS, not a wire contract.
 * Implement these mappings from the agreed FastAPI schemas, then set confirmed=true.
 * No speculative list/detail/review endpoint is called before that.
 */

const TERMINAL_STATES = new Set([
  'completed',
  'partial',
  'failed'
]);

function decodeRun(raw) {
  if (!raw || !raw.id) {
    throw new Error('Invalid run response from FastAPI');
  }

  const documents = raw.documents ?? [];
  const findings = raw.findings ?? [];

  const terminal = TERMINAL_STATES.has(raw.status);

  // Only display a completed scientific report when
  // the backend confirms a completed analysis.
  // Partial and failed runs retain their status,
  // documents, errors and other metadata.
  const result =
    raw.status === 'completed' &&
    Array.isArray(raw.findings)
      ? {
          status: 'completed',
          documents_analyzed:
            raw.summary?.documents_analyzed ?? 0,
          findings: raw.findings,
          summary: raw.summary
        }
      : null;

  return {
    id: raw.id,
    status: raw.status,
    terminal: TERMINAL_STATES.has(raw.status),

    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
    completedAt: raw.completed_at ?? null,

    documents: documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      status: doc.status
    })),

    documentErrors: documents
      .filter(doc => doc.error_message)
      .map(doc => ({
        documentId: doc.id,
        filename: doc.filename,
        message: doc.error_message
      })),

    method: raw.analysis_method ?? null,

    fallback: {
      used: raw.fallback_used ?? false,
      reason: raw.fallback_reason ?? null
    },

    result,
    reviews: {},
    errorMessage: raw.error_message ?? null
  };
}

function decodeHistory(raw) {
  if (!Array.isArray(raw)) {
    throw new Error('Invalid history response');
  }

  return raw.map(decodeRun);
}

function encodeReview(review) {
  return {
    status: review.status,
    note: review.note ?? ''
  };
}

function decodeReview(raw) {
  return {
    status: raw.status,
    note: raw.note ?? '',
    updatedAt: raw.updated_at ?? null
  };
}

export const backendContract = {
  confirmed: true,

  uploadField: 'files',
  createPath: '/runs',

  detailPath: runId =>
    `/runs/${encodeURIComponent(runId)}`,

  historyPath: '/runs',

  reviewPath: (_runId, findingId) =>
    `/findings/${encodeURIComponent(findingId)}/review`,

  sourceConfirmed: true,

  sourcePath: (_runId, documentId) =>
    `/documents/${encodeURIComponent(documentId)}/source`,

  decodeRun,
  decodeHistory,
  encodeReview,
  decodeReview
};
