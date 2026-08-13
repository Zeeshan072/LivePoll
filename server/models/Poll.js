// ============================================================
// models/Poll.js — The Poll Data Model
// ============================================================
// In MongoDB, a "model" is a blueprint for the documents
// (records) stored in a collection. Think of it like a table
// definition in SQL — it describes what fields each poll
// document can have, what types they must be, and what rules
// they must follow (validation).
//
// We use Mongoose (a library on top of MongoDB) to define
// this blueprint. Mongoose calls it a "Schema".
//
// Naming convention:
//   • Schema  → the shape/rules (PollSchema below)
//   • Model   → the class we use to interact with the DB (Poll)
// ============================================================

const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────
// Sub-schema: a single poll option
// ─────────────────────────────────────────────────────────────
// Each poll has an array of options. Each option is a small
// object with two fields: the text shown to voters, and a
// running total of how many times it has been voted for.
//
// We define this as a separate sub-schema so Mongoose gives
// each option its own unique _id automatically — we'll use
// that _id later to identify which option was voted on.
// ─────────────────────────────────────────────────────────────
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Each option must have text'],
    trim: true, // removes accidental leading/trailing spaces
    minlength: [1, 'Option text cannot be empty'],
    maxlength: [150, 'Option text must be 150 characters or fewer'],
  },
  votes: {
    type: Number,
    default: 0,   // starts at 0 when the poll is created
    min: [0, 'Vote count cannot be negative'],
  },
});

// ─────────────────────────────────────────────────────────────
// Main schema: the Poll document
// ─────────────────────────────────────────────────────────────
const pollSchema = new mongoose.Schema(
  {
    // ── The poll question ─────────────────────────────────
    // e.g. "What is your favourite programming language?"
    question: {
      type: String,
      required: [true, 'A poll must have a question'],
      trim: true,
      minlength: [5, 'Question must be at least 5 characters long'],
      maxlength: [300, 'Question must be 300 characters or fewer'],
    },

    // ── The answer options ────────────────────────────────
    // An array of optionSchema objects (2–6 options required).
    // Mongoose stores this as an embedded array inside the poll
    // document — no separate "options" collection needed.
    options: {
      type: [optionSchema],
      validate: [
        {
          // Must have at least 2 options
          validator: (opts) => opts.length >= 2,
          message: 'A poll must have at least 2 options',
        },
        {
          // Must have at most 6 options
          validator: (opts) => opts.length <= 6,
          message: 'A poll cannot have more than 6 options',
        },
      ],
    },

    // ── Creator identifier ────────────────────────────────
    // Since we have no user accounts, we generate a random
    // UUID in the browser and store it in localStorage.
    // This creatorId is sent when creating or closing a poll
    // so we can verify "did this request come from the person
    // who created this poll?" without needing a login system.
    //
    // ⚠️  This is a simple protection, not bank-grade security.
    //     It's appropriate for an anonymous polling app.
    creatorId: {
      type: String,
      required: [true, 'A creator identifier is required'],
      trim: true,
    },

    // ── Open / closed status ──────────────────────────────
    // true  → the poll is accepting votes
    // false → the poll has been closed (manually or by expiry)
    isOpen: {
      type: Boolean,
      default: true,
    },

    // ── Expiry date ───────────────────────────────────────
    // Optional. If set, the poll automatically closes once
    // this date/time is reached (we check this on every fetch).
    // null means "no expiry" — the poll stays open until
    // the creator manually closes it.
    expiresAt: {
      type: Date,
      default: null,
    },
  },

  // ── Schema options ──────────────────────────────────────
  {
    // timestamps: true tells Mongoose to automatically add two
    // extra fields to every document:
    //   • createdAt — set once when the document is first saved
    //   • updatedAt — updated every time the document changes
    // We don't have to manage these manually.
    timestamps: true,
  }
);

// ─────────────────────────────────────────────────────────────
// Virtual property: totalVotes
// ─────────────────────────────────────────────────────────────
// A "virtual" is a computed property that is NOT stored in
// MongoDB. It's calculated on the fly from data that IS stored.
//
// poll.totalVotes will sum up the votes across all options.
// We use this in the API responses so the frontend doesn't
// have to do the addition itself.
//
// { virtuals: true } in toJSON means virtuals are included
// when we convert the document to a plain JSON object (which
// Express does automatically when we call res.json()).
// ─────────────────────────────────────────────────────────────
pollSchema.virtual('totalVotes').get(function () {
  // `this` refers to the current poll document
  return this.options.reduce((sum, option) => sum + option.votes, 0);
});

// Make virtuals appear when the document is sent as JSON
pollSchema.set('toJSON', { virtuals: true });

// ─────────────────────────────────────────────────────────────
// Instance method: isExpired()
// ─────────────────────────────────────────────────────────────
// A helper you can call on any poll document to check whether
// its expiry date has passed:
//
//   const poll = await Poll.findById(id);
//   if (poll.isExpired()) { ... }
//
// Returns true if expiresAt is set AND that date is in the past.
// ─────────────────────────────────────────────────────────────
pollSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;           // no expiry set → never expires
  return new Date() > new Date(this.expiresAt); // true if current time is past expiry
};

// ─────────────────────────────────────────────────────────────
// Database index: sort by newest first efficiently
// ─────────────────────────────────────────────────────────────
// When we fetch "all polls", we'll sort them by createdAt
// descending (newest first). Adding an index on this field
// makes that query fast even when the collection is large.
//
// -1 = descending order index
// ─────────────────────────────────────────────────────────────
pollSchema.index({ createdAt: -1 });

// ─────────────────────────────────────────────────────────────
// Create and export the Model
// ─────────────────────────────────────────────────────────────
// mongoose.model('Poll', pollSchema) does two things:
//   1. Creates a JavaScript class (Poll) with methods like
//      Poll.find(), Poll.findById(), Poll.create(), etc.
//   2. Tells Mongoose to store documents in a MongoDB
//      collection called "polls" (lowercase + plural of 'Poll').
// ─────────────────────────────────────────────────────────────
const Poll = mongoose.model('Poll', pollSchema);

module.exports = Poll;
