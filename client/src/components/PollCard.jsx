// ============================================================
// src/components/PollCard.jsx — Single Poll Card
// ============================================================
// A reusable card displayed in the Browse Polls list.
// Receives one poll object as a prop and renders its summary.
//
// Props:
//   poll — a poll document from GET /api/polls, shape:
//   {
//     _id:       string       (MongoDB ID)
//     question:  string
//     options:   Array        (subdocuments with text/votes)
//     isOpen:    boolean
//     expiresAt: string|null  (ISO date or null)
//     totalVotes: number      (virtual from schema)
//     createdAt: string       (ISO date)
//   }
// ============================================================

import { Link } from 'react-router-dom';

// ── Helper: format a date string for display ─────────────────
// Converts "2026-08-13T10:00:00.000Z" → "Aug 13, 2026"
function formatDate(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Helper: describe time remaining until expiry ──────────────
function expiryLabel(expiresAt, isOpen) {
  if (!expiresAt) return null;

  const now = Date.now();
  const exp = new Date(expiresAt).getTime();

  if (!isOpen || exp <= now) return 'Expired';

  const diffMs  = exp - now;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay >= 1) return `Expires in ${diffDay}d`;
  if (diffHr  >= 1) return `Expires in ${diffHr}h`;
  return `Expires in ${diffMin}m`;
}

function PollCard({ poll }) {
  const {
    _id,
    question,
    options,
    isOpen,
    expiresAt,
    totalVotes,
    createdAt,
  } = poll;

  const expiry  = expiryLabel(expiresAt, isOpen);
  const created = formatDate(createdAt);

  return (
    <article className="poll-card">
      {/* Status badge — green for open, red for closed */}
      <div className="poll-card__badges">
        <span className={`status-badge ${isOpen ? 'status-badge--open' : 'status-badge--closed'}`}>
          <span className="status-badge__dot" aria-hidden="true" />
          {isOpen ? 'Open' : 'Closed'}
        </span>

        {/* Expiry chip — only shown when an expiry date is set */}
        {expiry && (
          <span className="expiry-chip">
            ⏱ {expiry}
          </span>
        )}
      </div>

      {/* Poll question */}
      <h2 className="poll-card__question">{question}</h2>

      {/* Stats row */}
      <div className="poll-card__stats">
        <span className="poll-stat">
          <span className="poll-stat__icon" aria-hidden="true">📋</span>
          {options.length} option{options.length !== 1 ? 's' : ''}
        </span>
        <span className="poll-stat">
          <span className="poll-stat__icon" aria-hidden="true">🗳️</span>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </span>
        {created && (
          <span className="poll-stat">
            <span className="poll-stat__icon" aria-hidden="true">📅</span>
            {created}
          </span>
        )}
      </div>

      {/* Action — navigate to /poll/:id */}
      <div className="poll-card__footer">
        <Link
          to={`/poll/${_id}`}
          className="btn btn--primary poll-card__btn"
          aria-label={`View poll: ${question}`}
        >
          View Poll →
        </Link>
      </div>
    </article>
  );
}

export default PollCard;
