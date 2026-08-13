// ============================================================
// src/pages/HomePage.jsx — Browse Polls Page
// ============================================================
// The main landing page at "/". Displays all polls from the
// backend, with live search, status filtering, and real-time
// updates via Socket.IO.
//
// ── Data flow ────────────────────────────────────────────────
//   1. On mount → fetch polls from GET /api/polls (with params)
//   2. User types in search → debounced refetch with ?search=...
//   3. User picks a status filter → refetch with ?status=...
//   4. Socket.IO 'vote_update' → update that poll's votes in state
//   5. Socket.IO 'poll_closed' → mark that poll as closed in state
//
// ── Why update state from Socket.IO instead of refetching? ───
//   Refetching on every vote would spam the server if many users
//   are voting simultaneously. Instead we do a targeted update:
//   only change the specific poll that was affected.
//
// ── State ────────────────────────────────────────────────────
//   polls      — array of poll objects currently shown
//   isLoading  — true while the HTTP request is in-flight
//   error      — error string or null
//   search     — the text in the search input
//   status     — 'all' | 'open' | 'closed'
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAllPolls } from '../api/pollApi';
import { useSocket } from '../context/SocketContext';
import PollCard from '../components/PollCard';

// How long to wait after the user stops typing before fetching.
// 400ms is a good balance — fast enough to feel instant,
// slow enough not to spam the server on every keystroke.
const DEBOUNCE_MS = 400;

// The three status filter options and their backend query values
const STATUS_FILTERS = [
  { label: 'All Polls', value: 'all' },
  { label: 'Open',      value: 'open' },
  { label: 'Closed',    value: 'closed' },
];

function HomePage() {
  // ── State ─────────────────────────────────────────────────
  const [polls, setPolls]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('all');

  // useSocket() reads from SocketContext — the same single socket
  // connection shared across the whole app. No new socket is created.
  const { socket } = useSocket();

  // ── Fetch polls from the backend ──────────────────────────
  // useCallback memoises this function so it doesn't get
  // recreated on every render. We pass it to useEffect below.
  const fetchPolls = useCallback(async (searchQuery, statusFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params for GET /api/polls
      const params = {};
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const response = await getAllPolls(params);
      // The backend returns: { success: true, count: N, data: [...] }
      setPolls(response.data.data);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        'Unable to load polls. Please check your connection.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []); // no dependencies — this function never needs to change

  // ── Debounced search ──────────────────────────────────────
  // We store a timer reference in a ref (not state) because
  // changing a ref doesn't trigger a re-render.
  const debounceTimer = useRef(null);

  useEffect(() => {
    // Cancel the previous timer if the user is still typing
    clearTimeout(debounceTimer.current);

    // Start a new timer — fire the fetch after DEBOUNCE_MS ms
    debounceTimer.current = setTimeout(() => {
      fetchPolls(search, status);
    }, DEBOUNCE_MS);

    // Cleanup: cancel the timer if the component unmounts while
    // the user is still typing (avoids setting state on unmounted component)
    return () => clearTimeout(debounceTimer.current);
  }, [search, status, fetchPolls]);
  // This effect re-runs whenever search OR status changes.

  // ── Socket.IO real-time updates ───────────────────────────
  // The Browse page isn't "inside" a poll room, so it doesn't
  // call join_poll. It only listens to global events.
  //
  // When someone votes on a poll that's currently visible in
  // the list, we update just that poll's options + totalVotes
  // in our local state — no refetch needed.
  useEffect(() => {
    if (!socket) return;

    // 'vote_update' → { pollId, options, totalVotes }
    // Emitted by the server after every successful vote.
    const onVoteUpdate = ({ pollId, options, totalVotes }) => {
      setPolls((prev) =>
        prev.map((poll) =>
          poll._id === pollId
            ? { ...poll, options, totalVotes }   // update matching poll
            : poll                                // leave others unchanged
        )
      );
    };

    // 'poll_closed' → { pollId }
    // Emitted by the server when a creator closes their poll.
    const onPollClosed = ({ pollId }) => {
      setPolls((prev) =>
        prev.map((poll) =>
          poll._id === pollId
            ? { ...poll, isOpen: false }
            : poll
        )
      );
    };

    socket.on('vote_update', onVoteUpdate);
    socket.on('poll_closed', onPollClosed);

    // Cleanup: remove these listeners when the component unmounts
    // or when the socket instance changes. If we don't do this,
    // old listeners pile up and run multiple times (memory leak).
    return () => {
      socket.off('vote_update', onVoteUpdate);
      socket.off('poll_closed', onPollClosed);
    };
  }, [socket]);

  // ── Render helpers ────────────────────────────────────────

  // Loading skeleton — shown while the first fetch is in-flight
  const renderLoading = () => (
    <div className="browse-feedback" role="status" aria-live="polite">
      <div className="loading-spinner browse-spinner" aria-hidden="true" />
      <p>Loading polls…</p>
    </div>
  );

  // Error state — shown if the API call fails
  const renderError = () => (
    <div className="browse-feedback browse-feedback--error" role="alert">
      <span className="browse-feedback__icon" aria-hidden="true">⚠️</span>
      <p>{error}</p>
      <button
        className="btn btn--ghost"
        onClick={() => fetchPolls(search, status)}
      >
        Retry
      </button>
    </div>
  );

  // Empty state — no polls matched the current search/filter
  const renderEmpty = () => (
    <div className="browse-feedback" role="status">
      <span className="browse-feedback__icon" aria-hidden="true">
        {search ? '🔍' : '🗳️'}
      </span>
      <p>
        {search
          ? `No polls found for "${search}".`
          : status !== 'all'
          ? `No ${status} polls found.`
          : 'No polls yet — be the first to create one!'}
      </p>
      <Link to="/create" className="btn btn--primary">
        + Create a Poll
      </Link>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────
  return (
    <main className="page page--browse">

      {/* Page header */}
      <div className="browse-header">
        <div>
          <h1 className="browse-title">Browse Polls</h1>
          <p className="browse-subtitle">
            Discover polls and vote in real time — results update live.
          </p>
        </div>
        <Link to="/create" className="btn btn--primary browse-create-btn">
          + Create Poll
        </Link>
      </div>

      {/* Controls: search + status filters */}
      <div className="browse-controls">

        {/* Search input */}
        <div className="search-box">
          <span className="search-box__icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            className="search-box__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search polls…"
            aria-label="Search polls"
          />
          {/* Clear button — only shown when there is text */}
          {search && (
            <button
              className="search-box__clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="filter-tabs" role="group" aria-label="Filter polls by status">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              className={`filter-tab ${status === value ? 'filter-tab--active' : ''}`}
              onClick={() => setStatus(value)}
              aria-pressed={status === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results area */}
      <section aria-label="Poll list">
        {isLoading ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : polls.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            {/* Result count */}
            <p className="browse-count" aria-live="polite">
              {polls.length} poll{polls.length !== 1 ? 's' : ''} found
              {search && ` for "${search}"`}
              {status !== 'all' && ` · ${status}`}
            </p>

            {/* Poll cards grid */}
            <div className="poll-grid">
              {polls.map((poll) => (
                <PollCard key={poll._id} poll={poll} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default HomePage;
