// ============================================================
// src/components/PollOption.jsx — Single Voteable Poll Option
// ============================================================
// Displays one option row inside the Poll Detail page.
// Responsible for:
//   • Showing the option text
//   • Drawing the animated vote percentage bar
//   • Showing vote count + percentage text
//   • Rendering a Vote button (when the poll is open and
//     the user hasn't voted yet)
//   • Showing "✓ Your vote" when the user chose this option
//   • Highlighting the leading option (most votes)
//
// ── Props ────────────────────────────────────────────────────
//   option       { _id, text, votes }   — the option object
//   totalVotes   number                 — sum of all votes on the poll
//   isVoted      boolean               — true if user picked THIS option
//   hasVoted     boolean               — true if user picked ANY option
//   canVote      boolean               — poll is open + not expired + no prior vote
//   isVoting     boolean               — network request in progress
//   isLeader     boolean               — this option has the most votes
//   onVote       (optionId) => void    — called when Vote button clicked
// ============================================================

function PollOption({
  option,
  totalVotes,
  isVoted,
  hasVoted,
  canVote,
  isVoting,
  isLeader,
  onVote,
}) {
  // ── Percentage calculation ─────────────────────────────────
  // Avoid dividing by zero when the poll has no votes yet.
  const percentage =
    totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

  // ── CSS class composition ──────────────────────────────────
  // We build a className string by combining base class with
  // optional modifier classes depending on state.
  let optionClass = 'poll-option';
  if (isVoted)   optionClass += ' poll-option--voted';
  if (isLeader && totalVotes > 0) optionClass += ' poll-option--leader';

  return (
    <div className={optionClass}>
      {/* ── Option header: text + badge/button ──────────────── */}
      <div className="poll-option__header">
        <span className="poll-option__text">{option.text}</span>

        {/* "✓ Your vote" badge — only on the option the user picked */}
        {isVoted && (
          <span className="your-vote-badge" aria-label="Your vote">
            ✓ Your vote
          </span>
        )}

        {/* Vote button — only shown when voting is allowed */}
        {canVote && (
          <button
            className="btn btn--primary btn--sm option-vote-btn"
            onClick={() => onVote(option._id)}
            disabled={isVoting}
            aria-label={`Vote for ${option.text}`}
          >
            {isVoting ? (
              <span className="spinner spinner--sm" aria-hidden="true" />
            ) : (
              'Vote'
            )}
          </button>
        )}
      </div>

      {/* ── Progress bar ────────────────────────────────────── */}
      {/*  The width is set as an inline style so CSS transitions
           can animate it smoothly every time votes change.    */}
      <div
        className="option-bar-wrap"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${option.text}: ${percentage}%`}
      >
        <div
          className={`option-bar-fill ${isLeader && totalVotes > 0 ? 'option-bar-fill--leader' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* ── Stats row: count + percentage ───────────────────── */}
      <div className="option-stats">
        <span className="option-stats__count">
          {option.votes} vote{option.votes !== 1 ? 's' : ''}
        </span>
        <span className="option-stats__pct">{percentage}%</span>
      </div>
    </div>
  );
}

export default PollOption;
