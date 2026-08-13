// ============================================================
// routes/pollRoutes.js — Poll API Route Definitions
// ============================================================
// This file maps URLs to controller functions.
// Think of it as a switchboard:
//
//   Incoming URL                    → Controller function
//   ──────────────────────────────────────────────────────
//   GET    /api/polls               → getAllPolls
//   GET    /api/polls/:id           → getPollById
//   POST   /api/polls               → createPoll
//   POST   /api/polls/:id/vote      → votePoll
//   PATCH  /api/polls/:id/close     → closePoll
//
// Note: the /api/polls prefix is added in server.js when we
// mount this router with: app.use('/api/polls', pollRoutes)
// So here we only write the part AFTER /api/polls.
// ============================================================

const express = require('express');
const router = express.Router();

const {
  getAllPolls,
  getPollById,
  createPoll,
  votePoll,
  closePoll,
} = require('../controllers/pollController');

// ── List all polls (with optional search & status filters) ──
// GET /api/polls
// GET /api/polls?search=football
// GET /api/polls?status=open
// GET /api/polls?search=football&status=open
router.get('/', getAllPolls);

// ── Get one poll by ID ──────────────────────────────────────
// GET /api/polls/:id
// e.g. GET /api/polls/6890a1b2c3d4e5f678901234
router.get('/:id', getPollById);

// ── Create a new poll ───────────────────────────────────────
// POST /api/polls
// Body: { question, options[], creatorId, expiresAt? }
router.post('/', createPoll);

// ── Vote on a poll ──────────────────────────────────────────
// POST /api/polls/:id/vote
// Body: { optionId }
// Note: this is POST (not PUT/PATCH) because voting creates
// a new event (adding a vote), even though we're modifying data.
router.post('/:id/vote', votePoll);

// ── Close a poll ────────────────────────────────────────────
// PATCH /api/polls/:id/close
// Body: { creatorId }
// PATCH = partial update (we're only changing isOpen, not the whole document)
router.patch('/:id/close', closePoll);

module.exports = router;
