
import React from 'react';
import { severityGroup, groups, counts } from './api.js';
import { ReviewControls } from './ReviewWorkspace.jsx';

const display = value => {
  if (value == null || value === '') return 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export function Icon({ name, size = 20 }) {
  const paths = {
    upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
    file: 'M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 13h8M8 17h6',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
    check: 'm5 12 4 4L19 6',
    cross: 'm6 6 12 12M6 18 18 6',
    layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5'
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.file} />
    </svg>
  );
}

export function Disclaimer() {
  return (
    <footer className="disclaimer">
      <span className="notice-icon">i</span>
      <p>
        <strong>Evidence integrity, with human judgment.</strong>{' '}
        BioLyze provides a preliminary evidence-integrity audit,
        not an FDA approval prediction or regulatory compliance
        certification. Severity is a triage label, not a regulatory
        risk determination. Demo documents are synthetic and fictional.
      </p>
    </footer>
  );
}

export function FindingCard({
  finding: f,
  onInspect,
  review,
  onReview,
  onSaveReview,
  reviewSaving,
  reviewMessage
}) {
  const group = severityGroup(f.severity);

  // Support both the Python verifier schema and existing demo data.
  const findingType = f.type ?? f.category;
  const explanation = f.description ?? f.explanation;
  const recommendation = f.recommendation ?? f.action;
  const requiresHumanReview =
    f.requires_human_review ?? f.review_required;

  return (
    <article className="finding">
      <div className="finding-meta">
        <span className={`badge ${group}`}>
          {display(f.severity)}
        </span>

        <span className="mono">
          {display(f.id)}
        </span>

        <span className="type">
          {findingType
            ? String(findingType).replaceAll('_', ' ')
            : ''}
        </span>
      </div>

      <h4>{display(f.title)}</h4>

      {f.category != null && (
        <p className="fineprint">
          Category: {display(f.category)}
        </p>
      )}

      <p>{display(explanation)}</p>

      {requiresHumanReview === true && (
        <div className="review-label">
          ◉ Human review required
        </div>
      )}

      {findingType === 'unsupported_claim' && (
        <p className="context-note">
          Supporting evidence requires further examination.
          A limitation of the uploaded package does not prove
          that evidence is absent elsewhere.
        </p>
      )}

      <div className="sources">
        {f.sources?.length ? (
          f.sources.map((source, index) => {
            const filename =
              source.document ??
              source.filename ??
              'Source filename unavailable';

            return (
              <div className="source" key={index}>
                <div>
                  <Icon name="file" size={15} />

                  <strong>{filename}</strong>

                  <span>
                    {source.page == null || source.page === ''
                      ? 'Page not provided'
                      : `Page ${display(source.page)}`}
                  </span>
                </div>

                <blockquote>
                  {source.quote == null || source.quote === ''
                    ? 'Quote not provided'
                    : display(source.quote)}
                </blockquote>

                <button
                  className="text-button inspect-button"
                  onClick={() => onInspect(source)}
                >
                  Inspect source{' '}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            );
          })
        ) : (
          <p>No source citation provided</p>
        )}
      </div>

      {f.guidance_reference != null && (
        <div className="guidance">
          <strong>Guidance reference</strong>
          <pre>{display(f.guidance_reference)}</pre>
        </div>
      )}

      <div className="action">
        <Icon name="arrow" size={17} />

        <p>
          <strong>Recommended action</strong>
          {display(recommendation)}
        </p>
      </div>

      <ReviewControls
        value={review}
        onChange={onReview}
        onSave={onSaveReview}
        saving={reviewSaving}
        message={reviewMessage}
      />
    </article>
  );
}

export function Comparison({ previous, current }) {
  return (
    <section className="comparison">
      <div className="section-heading">
        <h3>How the package changed</h3>
        <span className="eyebrow">RUN COMPARISON</span>
      </div>

      <div className="compare-grid">
        {[previous, current].map((run, i) => (
          <div key={i}>
            <span className="eyebrow">
              {i ? 'CURRENT RUN' : 'PREVIOUS RUN'}
            </span>

            <strong>
              {run.response.findings.length} findings{' '}
              <small>
                · {run.response.documents_analyzed} documents
              </small>
            </strong>

            <p>
              {groups
                .map(
                  g => `${counts(run.response)[g]} ${g}`
                )
                .join(' · ')}
            </p>

            <ul>
              {run.filenames.map((name, j) => (
                <li key={j}>{name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="fineprint">
        Counts only. Issue-level comparison requires a stable
        issue identity guaranteed by the backend.
      </p>
    </section>
  );
}
