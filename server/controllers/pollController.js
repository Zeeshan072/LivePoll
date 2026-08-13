// ============================================================
// controllers/pollController.js — Poll Business Logic
// ============================================================
// A "controller" holds the actual logic for each API endpoint.
// The router (pollRoutes.js) decides WHICH URL maps to WHICH
// controller function. The controller decides WHAT to do:
// talk to the database, validate the data, and send back
// a response.
//
// Each function here follows the same pattern:
//   1. Read data from the request (req.params, req.body, req.query)
//   2. Talk to MongoDB using the Poll model
//   3. Send back a JSON response (res.json)
//   4. Pass any errors to next(error) → errorHandler picks it up
// ============================================================

const Poll = require('../models/Poll');

// ─────────────────────────────────────────────────────────────
// Helper: autoCloseIfExpired(poll)
// ─────────────────────────────────────────────────────────────
// If a poll has an expiry date that has passed, this function
// marks it as closed in the database. We call this whenever
// we fetch a poll so the status is always up to date.
//
// Returns the poll (whether or not it was changed).
// ─────────────────────────────────────────────────────────────
const autoCloseIfExpired = async (poll) => {
  if (poll.isOpen && poll.isExpired()) {
    poll.isOpen = false;
    await poll.save();
  }
  return poll;
};

// ─────────────────────────────────────────────────────────────
// GET /api/polls
// ─────────────────────────────────────────────────────────────
// Returns all polls, newest first.
//
// Optional query parameters:
//   ?search=javascript   → filter polls whose question contains this text
//   ?status=open         → only return open polls
//   ?status=closed       → only return closed polls
//
// Example: GET /api/polls?search=language&status=open
// ─────────────────────────────────────────────────────────────
const getAllPolls = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    // Start with an empty filter — matches everything
    const filter = {};

    // If a search term was provided, add a case-insensitive
    // regex match on the question field.
    // $regex = "contains this text"
    // $options: 'i' = case-insensitive
    if (search && search.trim()) {
      filter.question = { $regex: search.trim(), $options: 'i' };
    }

    // Fetch from DB, sorted by newest first (-1 = descending)
    const polls = await Poll.find(filter).sort({ createdAt: -1 });

    // Auto-close any expired polls we just fetched.
    // We do this here (rather than on a timer) so the status
    // is always accurate when clients request it.
    const updatedPolls = await Promise.all(
      polls.map((poll) => autoCloseIfExpired(poll))
    );

    // Apply status filter AFTER auto-closing so a newly-expired
    // poll correctly appears in the "closed" list.
    let result = updatedPolls;
    if (status === 'open') {
      result = updatedPolls.filter((p) => p.isOpen);
    } else if (status === 'closed') {
      result = updatedPolls.filter((p) => !p.isOpen);
    }

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    next(error); // hand off to errorHandler.js
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/polls/:id
// ─────────────────────────────────────────────────────────────
// Returns one poll by its MongoDB ID.
//
// :id is a URL parameter. For example:
//   GET /api/polls/6890a1b2c3d4e5f678901234
//   → req.params.id = "6890a1b2c3d4e5f678901234"
// ─────────────────────────────────────────────────────────────
const getPollById = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);

    // If no document was found, send a 404 Not Found response
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found. It may have been deleted.',
      });
    }

    // Auto-close if expired before sending the response
    await autoCloseIfExpired(poll);

    res.json({ success: true, data: poll });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/polls
// ─────────────────────────────────────────────────────────────
// Creates a new poll.
//
// Request body (JSON):
// {
//   "question":  "What is the best framework?",
//   "options":   ["React", "Vue", "Angular"],   ← array of strings
//   "creatorId": "abc-123-uuid",                ← from browser localStorage
//   "expiresAt": "2026-08-20T00:00:00.000Z"     ← optional ISO date string
// }
// ─────────────────────────────────────────────────────────────
const createPoll = async (req, res, next) => {
  try {
    const { question, options, creatorId, expiresAt } = req.body;

    // ── Basic input checks ────────────────────────────────
    // We check these early to send clear messages before
    // Mongoose validation even runs.
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A question is required.',
      });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 options.',
      });
    }

    if (options.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'A poll can have at most 6 options.',
      });
    }

    if (!creatorId || !creatorId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A creator identifier is required.',
      });
    }

    // ── Convert options from strings to objects ────────────
    // The frontend sends: ["React", "Vue", "Angular"]
    // The Poll model expects: [{ text: "React" }, { text: "Vue" }, ...]
    // votes starts at 0 automatically (from schema default)
    const formattedOptions = options
      .map((text) => ({ text: String(text).trim() }))
      .filter((opt) => opt.text.length > 0); // remove any blank options

    if (formattedOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 non-empty options are required.',
      });
    }

    // ── Save to MongoDB ────────────────────────────────────
    const poll = await Poll.create({
      question: question.trim(),
      options: formattedOptions,
      creatorId: creatorId.trim(),
      expiresAt: expiresAt || null,
    });

    // 201 Created — the standard HTTP status for a successful creation
    res.status(201).json({ success: true, data: poll });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/polls/:id/vote
// ─────────────────────────────────────────────────────────────
// Records a vote for one option on a poll.
//
// Request body (JSON):
// {
//   "optionId": "64a1b2c3d4e5f6789012345a"  ← the _id of the chosen option
// }
//
// Why use optionId instead of an index number?
// Because MongoDB gives each subdocument its own unique _id.
// Using _id is safer than an index — it won't break if the
// options array ever changes order.
// ─────────────────────────────────────────────────────────────
const votePoll = async (req, res, next) => {
  try {
    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({
        success: false,
        message: 'An optionId is required.',
      });
    }

    // Fetch the poll first so we can run our checks
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found.',
      });
    }

    // Auto-close if expired before checking isOpen
    await autoCloseIfExpired(poll);

    if (!poll.isOpen) {
      return res.status(400).json({
        success: false,
        message: 'This poll is closed and is no longer accepting votes.',
      });
    }

    // Verify the optionId exists inside this poll's options array.
    // Mongoose gives every subdocument an .id() helper that finds
    // a subdocument by its _id.
    const optionExists = poll.options.id(optionId);
    if (!optionExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid option. That option does not exist on this poll.',
      });
    }

    // ── Atomic increment using $inc ────────────────────────
    // Instead of: read votes → add 1 → save
    // We use:     MongoDB adds 1 directly on the server
    //
    // This is "atomic" — it's one single operation that cannot
    // be interrupted by another request. This prevents the bug
    // where two users vote at the same millisecond and one
    // vote gets lost.
    //
    // 'options.$.votes': 1  →  $ is a positional operator that
    // refers to the matched subdocument (the one whose _id matches)
    const updatedPoll = await Poll.findOneAndUpdate(
      {
        _id: req.params.id,
        'options._id': optionId,
      },
      {
        $inc: { 'options.$.votes': 1 },
      },
      {
        returnDocument: 'after', // return the document AFTER the update (Mongoose 8+)
      }
    );

    // ── Broadcast vote_update to everyone viewing this poll ───
    // req.app.get('io') retrieves the Socket.IO server instance
    // that we stored with app.set('io', io) in server.js.
    //
    // io.to(room).emit(event, data) sends the event ONLY to
    // sockets that have joined that specific room (i.e. users
    // currently viewing this poll's detail page).
    //
    // The React client will listen for 'vote_update' and update
    // the vote bars on screen without any page refresh.
    const io = req.app.get('io');
    io.to(`poll:${req.params.id}`).emit('vote_update', {
      pollId: req.params.id,
      options: updatedPoll.options,   // full updated options array with new vote counts
      totalVotes: updatedPoll.totalVotes, // virtual field (sum of all votes)
    });

    res.json({ success: true, data: updatedPoll });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/polls/:id/close
// ─────────────────────────────────────────────────────────────
// Closes a poll so it no longer accepts votes.
// Only the poll creator (verified by creatorId) can do this.
//
// Request body (JSON):
// {
//   "creatorId": "abc-123-uuid"  ← must match the creatorId stored on the poll
// }
// ─────────────────────────────────────────────────────────────
const closePoll = async (req, res, next) => {
  try {
    const { creatorId } = req.body;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        message: 'A creatorId is required to close a poll.',
      });
    }

    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found.',
      });
    }

    // ── Creator verification ───────────────────────────────
    // Since we have no login system, we compare the creatorId
    // sent in the request with the one stored when the poll
    // was created. If they don't match, we deny the request.
    //
    // 403 Forbidden = "I know who you are, but you don't have
    // permission to do this."
    if (poll.creatorId !== creatorId) {
      return res.status(403).json({
        success: false,
        message: 'Only the poll creator can close this poll.',
      });
    }

    if (!poll.isOpen) {
      return res.status(400).json({
        success: false,
        message: 'This poll is already closed.',
      });
    }

    // Mark as closed and save
    poll.isOpen = false;
    await poll.save();

    // ── Broadcast poll_closed to everyone viewing this poll ──
    // This lets the React client immediately disable the voting
    // UI for all connected viewers when a poll is closed, without
    // them needing to refresh the page.
    const io = req.app.get('io');
    io.to(`poll:${req.params.id}`).emit('poll_closed', {
      pollId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Poll closed successfully.',
      data: poll,
    });
  } catch (error) {
    next(error);
  }
};

// Export all five functions so pollRoutes.js can use them
module.exports = {
  getAllPolls,
  getPollById,
  createPoll,
  votePoll,
  closePoll,
};
