// ============================================================
// src/utils/creatorId.js — Anonymous Creator Identifier
// ============================================================
// PROBLEM this solves:
//   LivePoll has no user accounts. But we still need a way for
//   the poll creator to prove "I made this poll" so they can
//   close it later — without logging in.
//
// SOLUTION:
//   Generate a random UUID once and store it in localStorage.
//   localStorage is specific to the browser, so:
//   ✅ Same person, same browser → same ID (can close their polls)
//   ❌ Different browser / incognito / cleared storage → new ID
//      (cannot close polls created in a previous session)
//
// This is a deliberate trade-off for anonymous users.
// Phase 10 can upgrade this with proper authentication.
//
// ── What is a UUID? ─────────────────────────────────────────
//   UUID stands for "Universally Unique Identifier".
//   Example: "550e8400-e29b-41d4-a716-446655440000"
//   The probability of two UUIDs ever being the same is
//   astronomically small — effectively zero.
//
// ── Storage key used ────────────────────────────────────────
//   localStorage.getItem('livepoll_creator_id')
// ============================================================

const STORAGE_KEY = 'livepoll_creator_id';

/**
 * Returns the creator ID for the current browser session.
 * Creates and stores a new UUID if one doesn't already exist.
 *
 * @returns {string} A UUID string, e.g. "550e8400-e29b-41d4-a716-446655440000"
 */
export function getCreatorId() {
  // Check if we already have an ID stored
  let id = localStorage.getItem(STORAGE_KEY);

  if (!id) {
    // crypto.randomUUID() is a modern browser built-in API.
    // It's available in all browsers that support ES2020+.
    // The fallback uses Math.random() for very old browsers.
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

    localStorage.setItem(STORAGE_KEY, id);
    console.log(`[LivePoll] New creator ID generated: ${id}`);
  }

  return id;
}

/**
 * Checks whether the current browser session is the creator
 * of a given poll — by comparing the stored ID to the poll's
 * creatorId field.
 *
 * Used in PollDetailPage (Phase 8) to show the "Close Poll" button.
 *
 * @param {string} pollCreatorId - The creatorId field from the poll document
 * @returns {boolean}
 */
export function isCreator(pollCreatorId) {
  const myId = localStorage.getItem(STORAGE_KEY);
  return !!myId && myId === pollCreatorId;
}
