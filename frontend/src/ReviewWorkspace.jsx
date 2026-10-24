
import React, { useEffect, useRef, useState } from 'react';
import PdfPreview from './PdfPreview.jsx';

export const text = value =>
  value == null || value === ''
    ? 'Not provided'
    : typeof value === 'object'
      ? JSON.stringify(value, null, 2)
      : String(value);

export function Pipeline({ busy }) {
  const steps = [
    ['01', 'Prepare package', 'Select your PDF documents.'],
    ['02', 'Process evidence', 'Follow the reported run status.'],
    ['03', 'Inspect findings', 'Verify source references.'],
    ['04', 'Record your review', 'Save notes separately from findings.']
  ];

  return (
    <section className="pipeline-panel" aria-label="Analysis workflow">
      <div className="section-heading">
        <h2>Analysis workflow</h2>
        <span className="count-chip">
          {busy ? 'Request in progress' : 'Evidence to insight'}
        </span>
      </div>

      <ol>
        {steps.map(([number, title, description]) => (
          <li key={number}>
            <span>{number}</span>
            <div>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="fineprint">
        Workflow overview. The run detail view shows only states
        and timestamps supplied by its data adapter.
      </p>
    </section>
  );
}

export function ReviewControls({
  value,
  onChange,
  onSave,
  saving,
  message
}) {
  const review = value || {
    status: 'unreviewed',
    note: ''
  };

  return (
    <div className="review-controls">
      <label>
        Review status

        <select
          disabled={saving}
          value={review.status}
          onChange={e =>
            onChange({
              ...review,
              status: e.target.value
            })
          }
        >
          <option value="unreviewed">Unreviewed</option>
          <option value="reviewed">Reviewed</option>
          <option value="needs_clarification">
            Needs clarification
          </option>
        </select>
      </label>

      <label>
        Reviewer note

        <textarea
          disabled={saving}
          value={review.note}
          maxLength={5000}
          rows={2}
          placeholder="Record a question or follow-up…"
          onChange={e =>
            onChange({
              ...review,
              note: e.target.value
            })
          }
        />
      </label>

      <div className="review-save">
        <button
          className="secondary"
          disabled={saving || !onSave}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save review'}
        </button>

        <span role="status">{message}</span>
      </div>

      <p className="fineprint">
        Personal review only. “Reviewed” means inspected,
        not resolved or scientifically confirmed.
      </p>
    </div>
  );
}

export function EvidenceDialog({
  selection,
  api,
  runId,
  onClose
}) {
  const dialog = useRef(null);

  const { source, document } = selection;

  const filename =
    source.document ||
    source.filename ||
    document?.filename ||
    'Source document';

  const initialPage =
    Number.isInteger(Number(source.page)) &&
    Number(source.page) > 0
      ? Number(source.page)
      : 1;

  const [preview, setPreview] = useState({
    kind: 'loading'
  });

  const [attempt, setAttempt] = useState(0);
  const [page] = useState(initialPage);

  useEffect(() => {
    const node = dialog.current;
    const previous = window.document.activeElement;

    node.showModal();

    return () => {
      node.close();
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let url;

    const controller = new AbortController();

    setPreview({ kind: 'loading' });

    if (!document) {
      setPreview({
        kind: 'error',
        message:
          'A unique source document could not be identified.'
      });

      return () => controller.abort();
    }

    api.getSource(runId, document.id, {
      signal: controller.signal
    })
      .then(blob => {
        if (!active) return;

        url = URL.createObjectURL(blob);

        setPreview({
          kind: 'pdf',
          url,
          blob
        });
      })
      .catch(error => {
        if (active && error.name !== 'AbortError') {
          setPreview({
            kind: 'error',
            message: error.message
          });
        }
      });

    return () => {
      active = false;
      controller.abort();

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [api, runId, document, attempt]);

  return (
    <dialog
      ref={dialog}
      className="evidence-dialog"
      aria-labelledby="evidence-title"
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="evidence-head">
        <div>
          <span className="eyebrow">
            {api.mode === 'mock' ? 'DEMO PDF · ' : ''}
            SOURCE INSPECTION
          </span>

          <h2 id="evidence-title">
            {filename}
          </h2>

          <p>
            {source.page == null
              ? 'Page not provided'
              : `Citation page ${text(source.page)}`}
          </p>
        </div>

        <button
          className="secondary"
          onClick={onClose}
        >
          Close source
        </button>
      </div>

      <div className="citation-inspector">
        <h3>Quotation supplied in the response</h3>

        <blockquote>
          {source.quote == null || source.quote === ''
            ? 'Quote not provided'
            : text(source.quote)}
        </blockquote>
      </div>

      {preview.kind === 'loading' && (
        <p role="status">
          Retrieving source document…
        </p>
      )}

      {preview.kind === 'error' && (
        <div>
          <p className="error" role="alert">
            {preview.message}
          </p>

          {document && (
            <button
              className="secondary"
              onClick={() => setAttempt(n => n + 1)}
            >
              Retry source retrieval
            </button>
          )}
        </div>
      )}

      {preview.kind === 'pdf' && (
        <>
          <a
            className="text-button"
            href={`${preview.url}#page=${page}`}
            target="_blank"
            rel="noreferrer"
          >
            Open PDF in another tab ↗
          </a>

          <p className="fineprint">
            Source document rendered locally.
            The response quotation remains separate
            from the original PDF.
          </p>

          <PdfPreview
            blob={preview.blob}
            initialPage={page}
          />
        </>
      )}
    </dialog>
  );
}
