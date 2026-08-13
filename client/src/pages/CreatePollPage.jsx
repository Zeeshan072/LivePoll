// ============================================================
// src/pages/CreatePollPage.jsx — Create Poll Form
// ============================================================
// This page lets anonymous users create a new poll.
// It lives at the route: /create
//
// ── What this page does ──────────────────────────────────────
//   1. Manages a form with: question, 2–6 options, optional expiry
//   2. Validates the input before sending it to the server
//   3. Gets (or creates) the user's anonymous creatorId from
//      localStorage — this proves ownership without an account
//   4. Calls POST /api/polls via our createPoll API function
//   5. On success → redirects to /poll/:id (the new poll's page)
//   6. On failure → shows a friendly error message
//
// ── State variables ──────────────────────────────────────────
//   question  — the poll question text (string)
//   options   — array of option strings; always 2–6 items
//   expiresAt — ISO datetime string or '' if no expiry chosen
//   isLoading — true while the API request is in-flight
//   error     — validation or server error message to show the user
// ============================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPoll } from '../api/pollApi';
import { getCreatorId } from '../utils/creatorId';

function CreatePollPage() {
  // ── Navigate hook ─────────────────────────────────────────
  // useNavigate() returns a function we call to change the URL
  // programmatically (e.g. after a successful form submission).
  const navigate = useNavigate();

  // ── Form state ────────────────────────────────────────────
  const [question, setQuestion] = useState('');

  // We start with 2 empty strings — the minimum allowed options.
  // Each string is the text the user types into an option field.
  const [options, setOptions] = useState(['', '']);

  // datetime-local inputs give us a string like "2026-09-01T18:00".
  // Empty string means the user didn't set an expiry.
  const [expiresAt, setExpiresAt] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Option management helpers ─────────────────────────────

  // Add an empty option to the end of the list (max 6)
  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, '']);
  };

  // Remove the option at a specific index (min 2 options kept)
  const removeOption = (indexToRemove) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Update the text of one option when the user types
  const updateOption = (index, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // ── Client-side validation ────────────────────────────────
  // Returns an error message string if invalid, or null if valid.
  // We check BEFORE hitting the server to give instant feedback.
  const validate = () => {
    // Question checks
    if (!question.trim()) {
      return 'Please enter a poll question.';
    }
    if (question.trim().length < 5) {
      return 'Question must be at least 5 characters long.';
    }

    // Filter out empty/whitespace-only options
    const filled = options.map((o) => o.trim()).filter(Boolean);

    if (filled.length < 2) {
      return 'Please fill in at least 2 options.';
    }

    // Duplicate check (case-insensitive)
    const unique = new Set(filled.map((o) => o.toLowerCase()));
    if (unique.size !== filled.length) {
      return 'All options must be different from each other.';
    }

    // Expiry date check (only if the user chose one)
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return 'Expiry date must be at least a few minutes in the future.';
    }

    return null; // no errors ✅
  };

  // ── Form submit handler ───────────────────────────────────
  const handleSubmit = async (e) => {
    // Prevent the browser's default form-submit behaviour (page reload)
    e.preventDefault();

    // Clear any previous error before validating again
    setError('');

    // Validate first; stop if there's an error
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Get (or generate) the persistent creator ID from localStorage.
      // This is stored on the poll so the creator can close it later.
      const creatorId = getCreatorId();

      // Only include non-blank options in the payload
      const filledOptions = options.map((o) => o.trim()).filter(Boolean);

      // Build the request body
      const payload = {
        question: question.trim(),
        options: filledOptions,
        creatorId,
        // Only include expiresAt if the user actually set one
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      };

      // Call POST /api/polls (defined in src/api/pollApi.js)
      // The backend returns: { success: true, data: { _id, question, options, ... } }
      const response = await createPoll(payload);
      const newPoll = response.data.data;

      // ✅ Success! Navigate to the new poll's detail page.
      // React Router replaces the URL without a full page reload.
      navigate(`/poll/${newPoll._id}`);
    } catch (err) {
      // axios puts the server's JSON response in err.response.data
      const message =
        err?.response?.data?.message ||
        'Something went wrong. Please check your connection and try again.';
      setError(message);
    } finally {
      // Always turn off loading, whether success or failure
      setIsLoading(false);
    }
  };

  // ── Date/time helper ──────────────────────────────────────
  // The min attribute on datetime-local prevents the user from
  // picking a time in the past. We add 5 minutes of buffer.
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16); // "YYYY-MM-DDTHH:MM"

  // ── Render ────────────────────────────────────────────────
  return (
    <main className="page">
      {/* Page header */}
      <div className="page-hero">
        <div className="page-hero__icon">✏️</div>
        <h1 className="page-hero__title">Create a Poll</h1>
        <p className="page-hero__subtitle">
          Ask a question, add 2–6 options, and get a shareable link instantly.
        </p>
      </div>

      {/* Form card */}
      <div className="form-card">
        {/*
         * noValidate disables the browser's built-in HTML5 validation
         * popups. We handle validation ourselves in the validate()
         * function above, which gives us more control over the UX.
         */}
        <form onSubmit={handleSubmit} noValidate>

          {/* ── Question ───────────────────────────────────────── */}
          <div className="form-group">
            <label className="form-label" htmlFor="poll-question">
              Poll Question <span className="form-required" aria-label="required">*</span>
            </label>
            <textarea
              id="poll-question"
              className="form-textarea"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is your favourite programming language?"
              rows={3}
              maxLength={300}
              disabled={isLoading}
              aria-describedby="question-hint"
            />
            <span id="question-hint" className="form-hint">
              {question.length} / 300 characters
            </span>
          </div>

          {/* ── Options ────────────────────────────────────────── */}
          <div className="form-group">
            <div className="form-label-row">
              <label className="form-label" id="options-label">
                Options <span className="form-required" aria-label="required">*</span>
              </label>
              <span className="form-count" aria-live="polite">
                {options.length} / 6
              </span>
            </div>

            <ul className="options-list" aria-labelledby="options-label">
              {options.map((opt, idx) => (
                // We use idx as key here. Since we never re-order options
                // (only add/remove from end or by index), this is safe.
                <li key={idx} className="option-input-row">
                  {/* Numbered badge */}
                  <span className="option-badge" aria-hidden="true">
                    {idx + 1}
                  </span>

                  {/* Option text input */}
                  <input
                    type="text"
                    className="form-input option-input"
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    maxLength={120}
                    disabled={isLoading}
                    aria-label={`Option ${idx + 1}`}
                  />

                  {/* Remove button — only shown when > 2 options exist */}
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="btn-remove-option"
                      onClick={() => removeOption(idx)}
                      disabled={isLoading}
                      aria-label={`Remove option ${idx + 1}`}
                      title="Remove this option"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {/* Add option button (hidden at 6) */}
            {options.length < 6 ? (
              <button
                type="button"
                className="btn-add-option"
                onClick={addOption}
                disabled={isLoading}
              >
                <span aria-hidden="true">＋</span> Add Option
              </button>
            ) : (
              <p className="form-hint form-hint--center">
                Maximum 6 options reached.
              </p>
            )}
          </div>

          {/* ── Expiry (optional) ──────────────────────────────── */}
          <div className="form-group">
            <label className="form-label" htmlFor="poll-expires">
              Expiry Date &amp; Time{' '}
              <span className="form-optional">(optional)</span>
            </label>
            <input
              id="poll-expires"
              type="datetime-local"
              className="form-input form-input--datetime"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={minDateTime}
              disabled={isLoading}
              aria-describedby="expires-hint"
            />
            <span id="expires-hint" className="form-hint">
              Leave blank for a poll with no expiry. Once expired, voting
              closes automatically.
            </span>
          </div>

          {/* ── Error message ──────────────────────────────────── */}
          {error && (
            <div className="error-alert" role="alert" aria-live="assertive">
              <span className="error-alert__icon" aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Form action buttons ────────────────────────────── */}
          <div className="form-actions">
            <Link
              to="/"
              className="btn btn--ghost"
              // Disable tab focus while submitting
              tabIndex={isLoading ? -1 : 0}
              aria-disabled={isLoading}
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="btn btn--primary btn--submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  {/* CSS-animated spinner (defined in index.css) */}
                  <span className="spinner" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                <>⚡ Create Poll</>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default CreatePollPage;
