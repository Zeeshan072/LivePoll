// ============================================================
// src/pages/PollDetailPage.jsx — Poll Detail + Voting Page
// ============================================================
// Lives at: /poll/:id
//
// ── What this page does ──────────────────────────────────────
//   1. Reads the poll :id from the URL via useParams()
//   2. Fetches poll data from GET /api/polls/:id
//   3. Checks localStorage to see if this user already voted
//   4. Joins the Socket.IO poll room to receive live events
//   5. Lets the user vote (POST /api/polls/:id/vote)
//   6. Shows animated vote bars that update in real time
//   7. Listens for 'vote_update' → updates bars without reload
//   8. Listens for 'poll_closed' → disables voting in real time
//   9. Shows a "Close Poll" button only to the poll's creator
//  10. Provides a shareable link copy button
//
// ── State variables ──────────────────────────────────────────
//   poll             — the full poll object (null initially)
//   isLoading        — true while the initial fetch is in-flight
//   error            — string or null; shown in the error state
//   hasVoted         — true if localStorage says user voted here
//   votedOptionId    — which option _id the user voted for
//   isVoting         — true while the vote POST is in-flight
//   voteError        — error string specifically for vote failures
//   showCloseConfirm — true when the "Are you sure?" dialog is open
//   isClosing        — true while the close PATCH is in-flight
//   copied           — true for 2 seconds after copying the URL
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

import { getPollById, votePoll, closePoll } from '../api/pollApi';
import { useSocket } from '../context/SocketContext';
import { getCreatorId, isCreator } from '../utils/creatorId';
import PollOption from '../components/PollOption';

// ── localStorage key for tracking votes ──────────────────────
// Each poll gets its own key so tracking one poll doesn't
// interfere with tracking another.
// Key: "livepoll_voted_<pollId>"
// Value: the _id of the option the user voted for
const votedKey = (pollId) => `livepoll_voted_${pollId}`;

// ── Date formatting helpers ───────────────────────────────────
function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function expiryLabel(expiresAt, isOpen) {
  if (!expiresAt) return null;
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  if (!isOpen || exp <= now) return 'Expired';
  const diffMs  = exp - now;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay >= 1) return `Expires in ${diffDay} day${diffDay !== 1 ? 's' : ''}`;
  if (diffHr  >= 1) return `Expires in ${diffHr} hour${diffHr !== 1 ? 's' : ''}`;
  if (diffMin >= 1) return `Expires in ${diffMin} minute${diffMin !== 1 ? 's' : ''}`;
  return 'Expires very soon';
}

// ============================================================
// Component
// ============================================================
function PollDetailPage() {
  // ── URL param ─────────────────────────────────────────────
  // useParams() reads the :id segment from the URL.
  // Example: /poll/6890a1b2c3d4e5f678901234  →  id = "6890..."
  const { id } = useParams();

  // ── Socket.IO (shared connection from SocketContext) ──────
  const { socket } = useSocket();

  // ── Component state ───────────────────────────────────────
  const [poll,             setPoll]             = useState(null);
  const [isLoading,        setIsLoading]        = useState(true);
  const [error,            setError]            = useState(null);
  const [hasVoted,         setHasVoted]         = useState(false);
  const [votedOptionId,    setVotedOptionId]    = useState(null);
  const [isVoting,         setIsVoting]         = useState(false);
  const [voteError,        setVoteError]        = useState(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isClosing,        setIsClosing]        = useState(false);
  const [copied,           setCopied]           = useState(false);

  // ── Fetch the poll ────────────────────────────────────────
  // useCallback memoises the function so it's stable across renders.
  // We call it on mount and again when the user hits "Try Again".
  const fetchPoll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getPollById(id);
      const fetchedPoll = response.data.data;
      setPoll(fetchedPoll);

      // After we know the poll ID, check whether this user already voted.
      // If they did, we read which option they chose so we can highlight it.
      const storedVote = localStorage.getItem(votedKey(id));
      if (storedVote) {
        setHasVoted(true);
        setVotedOptionId(storedVote);
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.message;

      if (status === 404) {
        // Poll does not exist in the database
        setError('Poll not found. It may have been deleted or the link is incorrect.');
      } else if (msg === 'Invalid poll ID format.') {
        // MongoDB ObjectId format check failed
        setError('This poll link is invalid. The ID in the URL is not a recognised format.');
      } else {
        setError(msg || 'Unable to load this poll. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Run on mount (and when id changes, e.g. user navigates between polls)
  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  // ── Socket.IO: join room + event listeners ────────────────
  // This effect runs after mount. It:
  //   1. Emits 'join_poll' so the server puts us in the room
  //   2. Listens for 'vote_update' to update vote bars live
  //   3. Listens for 'poll_closed' to disable voting live
  //   4. On unmount: leaves the room and removes all listeners
  useEffect(() => {
    if (!socket || !id) return;

    // Tell the server we're viewing this poll.
    // The server adds our socket to the room "poll:<id>".
    socket.emit('join_poll', { pollId: id });
    console.log(`[LivePoll] Joined poll room: poll:${id}`);

    // ── vote_update ─────────────────────────────────────────
    // Fired by the backend after every successful vote on this poll.
    // Payload: { pollId, options: [...], totalVotes: N }
    //
    // We only update if the event is for OUR poll (the user might
    // have had a different poll open in another tab).
    const onVoteUpdate = ({ pollId, options, totalVotes }) => {
      if (pollId !== id) return;
      // Spread update: keep all other poll fields the same,
      // just replace options and totalVotes with the fresh data.
      setPoll((prev) => (prev ? { ...prev, options, totalVotes } : prev));
    };

    // ── poll_closed ─────────────────────────────────────────
    // Fired by the backend when the creator closes the poll.
    // Payload: { pollId }
    const onPollClosed = ({ pollId }) => {
      if (pollId !== id) return;
      setPoll((prev) => (prev ? { ...prev, isOpen: false } : prev));
      // Also dismiss the close confirmation dialog (if it was open)
      setShowCloseConfirm(false);
    };

    socket.on('vote_update', onVoteUpdate);
    socket.on('poll_closed', onPollClosed);

    // ── Cleanup ────────────────────────────────────────────
    // React calls this when the component unmounts OR when id/socket
    // changes. We must:
    //   • Tell the server we're leaving (so it can track viewer count)
    //   • Remove our listeners to prevent memory leaks
    return () => {
      socket.emit('leave_poll', { pollId: id });
      socket.off('vote_update', onVoteUpdate);
      socket.off('poll_closed', onPollClosed);
      console.log(`[LivePoll] Left poll room: poll:${id}`);
    };
  }, [socket, id]);

  // ── Vote handler ──────────────────────────────────────────
  const handleVote = async (optionId) => {
    if (!poll || isVoting) return;
    setIsVoting(true);
    setVoteError(null);

    try {
      // POST /api/polls/:id/vote   (function from pollApi.js)
      const response = await votePoll(id, optionId);
      const updatedPoll = response.data.data;

      // Update our local state with the fresh poll from the server.
      // (The Socket.IO event will also arrive shortly and do the same —
      //  that's fine, a duplicate setState with the same data is harmless.)
      setPoll(updatedPoll);

      // Persist the vote to localStorage so a page refresh still
      // shows the "Your vote" indicator and disables the vote buttons.
      localStorage.setItem(votedKey(id), optionId);
      setHasVoted(true);
      setVotedOptionId(optionId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Failed to record your vote. Please try again.';
      setVoteError(msg);
    } finally {
      setIsVoting(false);
    }
  };

  // ── Close poll handler ────────────────────────────────────
  const handleClose = async () => {
    if (!poll || isClosing) return;
    setIsClosing(true);

    try {
      const creatorId = getCreatorId();
      // PATCH /api/polls/:id/close   (function from pollApi.js)
      await closePoll(id, creatorId);
      // The 'poll_closed' socket event will arrive and update the UI.
      // We also update local state immediately for instant feedback.
      setPoll((prev) => (prev ? { ...prev, isOpen: false } : prev));
      setShowCloseConfirm(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Failed to close the poll. Please try again.';
      setVoteError(msg);
    } finally {
      setIsClosing(false);
    }
  };

  // ── Copy shareable link ───────────────────────────────────
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2 seconds
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Derived values (computed from current poll state) ─────
  // These recalculate on every render, so they always reflect
  // the latest poll state (including socket-pushed updates).
  const isExpired    = poll?.expiresAt && new Date(poll.expiresAt) <= new Date();
  const canVote      = !!(poll?.isOpen && !isExpired && !hasVoted);
  const userIsCreator = poll ? isCreator(poll.creatorId) : false;
  const leadingVotes = poll
    ? Math.max(...poll.options.map((o) => o.votes), 0)
    : 0;

  // ── Render: Loading ───────────────────────────────────────
  if (isLoading) {
    return (
      <main className="page">
        <div className="poll-detail__back">
          <Link to="/" className="btn btn--ghost btn--sm">← Back to Browse</Link>
        </div>
        <div className="browse-feedback">
          <div className="browse-spinner" role="status" aria-label="Loading poll" />
          <p>Loading poll…</p>
        </div>
      </main>
    );
  }

  // ── Render: Error ─────────────────────────────────────────
  if (error) {
    return (
      <main className="page">
        <div className="poll-detail__back">
          <Link to="/" className="btn btn--ghost btn--sm">← Back to Browse</Link>
        </div>
        <div className="browse-feedback browse-feedback--error" role="alert">
          <span className="browse-feedback__icon" aria-hidden="true">⚠️</span>
          <p>{error}</p>
          <button className="btn btn--ghost" onClick={fetchPoll}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // ── Render: Poll ──────────────────────────────────────────
  return (
    <main className="page">

      {/* ── Back navigation ─────────────────────────────────── */}
      <div className="poll-detail__back">
        <Link to="/" className="btn btn--ghost btn--sm">← Back to Browse</Link>
      </div>

      {/* ── Poll header ──────────────────────────────────────── */}
      <header className="poll-detail__header">

        {/* Status + expiry badges */}
        <div className="poll-detail__badges">
          <span
            className={`status-badge ${poll.isOpen ? 'status-badge--open' : 'status-badge--closed'}`}
          >
            <span className="status-badge__dot" aria-hidden="true" />
            {poll.isOpen ? 'Open' : 'Closed'}
          </span>

          {poll.expiresAt && (
            <span className={`expiry-chip ${isExpired ? 'expiry-chip--expired' : ''}`}>
              {isExpired ? '⏰ Expired' : `⏱ ${expiryLabel(poll.expiresAt, poll.isOpen)}`}
            </span>
          )}
        </div>

        {/* The poll question — h1 for semantic correctness */}
        <h1 className="poll-detail__question">{poll.question}</h1>

        {/* Stats row */}
        <div className="poll-detail__meta">
          <span>{poll.options.length} option{poll.options.length !== 1 ? 's' : ''}</span>
          <span className="poll-meta__dot" aria-hidden="true">·</span>
          <span>
            <strong>{poll.totalVotes}</strong> vote{poll.totalVotes !== 1 ? 's' : ''}
          </span>
          {poll.createdAt && (
            <>
              <span className="poll-meta__dot" aria-hidden="true">·</span>
              <span>Created {formatDate(poll.createdAt)}</span>
            </>
          )}
          {!poll.expiresAt && (
            <>
              <span className="poll-meta__dot" aria-hidden="true">·</span>
              <span>No expiry</span>
            </>
          )}
        </div>
      </header>

      {/* ── Closed / expired status banner ───────────────────── */}
      {(!poll.isOpen || isExpired) && (
        <div
          className={`poll-status-banner ${isExpired && poll.isOpen ? 'poll-status-banner--expired' : ''}`}
          role="status"
        >
          <span aria-hidden="true">{isExpired ? '⏰' : '🔴'}</span>
          <span>
            {isExpired
              ? 'This poll has expired and is no longer accepting votes.'
              : 'This poll is closed and is no longer accepting votes.'}
          </span>
        </div>
      )}

      {/* ── Vote error message ────────────────────────────────── */}
      {voteError && (
        <div className="error-alert" role="alert">
          <span className="error-alert__icon" aria-hidden="true">⚠️</span>
          <span>{voteError}</span>
          <button
            className="error-alert__dismiss"
            onClick={() => setVoteError(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── "Thank you for voting" confirmation ──────────────── */}
      {hasVoted && !voteError && (
        <div className="vote-success-banner" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <span>Your vote has been recorded. Results update in real time.</span>
        </div>
      )}

      {/* ── Options list ─────────────────────────────────────── */}
      <section className="poll-options-section" aria-label="Poll options and results">
        <div className="poll-options">
          {poll.options.map((option) => (
            <PollOption
              key={option._id}
              option={option}
              totalVotes={poll.totalVotes}
              isVoted={votedOptionId === option._id}
              hasVoted={hasVoted}
              canVote={canVote}
              isVoting={isVoting}
              isLeader={option.votes === leadingVotes && leadingVotes > 0}
              onVote={handleVote}
            />
          ))}
        </div>
      </section>

      {/* ── Creator: Close Poll ───────────────────────────────── */}
      {userIsCreator && poll.isOpen && !isExpired && (
        <div className="close-poll-section">
          {!showCloseConfirm ? (
            <button
              className="btn btn--danger"
              onClick={() => setShowCloseConfirm(true)}
              disabled={isClosing}
            >
              Close Poll
            </button>
          ) : (
            // Confirmation dialog — prevents accidental closes
            <div className="confirm-close" role="dialog" aria-modal="true"
                 aria-label="Confirm close poll">
              <p className="confirm-close__message">
                ⚠️ Are you sure you want to close this poll? Voting cannot
                continue after closing.
              </p>
              <div className="confirm-close__actions">
                <button
                  className="btn btn--ghost"
                  onClick={() => setShowCloseConfirm(false)}
                  disabled={isClosing}
                >
                  Cancel
                </button>
                <button
                  className="btn btn--danger"
                  onClick={handleClose}
                  disabled={isClosing}
                >
                  {isClosing ? (
                    <><span className="spinner spinner--sm" aria-hidden="true" /> Closing…</>
                  ) : (
                    'Yes, Close Poll'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Share section ─────────────────────────────────────── */}
      <div className="share-section">
        <p className="share-section__label">
          <span aria-hidden="true">🔗</span> Share this poll
        </p>
        <div className="share-url-row">
          <input
            type="text"
            className="share-url-input"
            value={window.location.href}
            readOnly
            aria-label="Poll shareable URL"
            onClick={(e) => e.target.select()}
          />
          <button
            className={`btn ${copied ? 'btn--success' : 'btn--ghost'} share-copy-btn`}
            onClick={handleCopyLink}
            aria-label="Copy poll link to clipboard"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

    </main>
  );
}

export default PollDetailPage;
