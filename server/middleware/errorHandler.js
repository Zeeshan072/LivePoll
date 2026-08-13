// ============================================================
// middleware/errorHandler.js — Global Error Handler
// ============================================================
// In Express, a function with FOUR parameters (err, req, res, next)
// is treated as an "error-handling middleware". Any time a route
// calls next(error), Express skips all normal middleware and jumps
// directly to this function.
//
// This single function handles every possible server error so
// we don't have to write error-handling code in every route.
//
// IMPORTANT: It must be mounted AFTER all routes in server.js.
// ============================================================

const errorHandler = (err, req, res, next) => {
  // Always log the full error in the server console for debugging
  console.error(`\n🔴 [Error] ${err.name}: ${err.message}`);

  // ── Mongoose: CastError ──────────────────────────────────
  // Happens when an invalid MongoDB ID is passed in the URL.
  // e.g. GET /api/polls/not-a-real-id
  // Without this, Express would return a confusing 500 error.
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      message: 'Invalid poll ID format.',
    });
  }

  // ── Mongoose: ValidationError ────────────────────────────
  // Happens when a document fails schema validation.
  // e.g. creating a poll with only 1 option, or no question.
  // We collect all the individual error messages into one string.
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(' | '),
    });
  }

  // ── Default: anything else ────────────────────────────────
  // Use the status code attached to the error if there is one,
  // otherwise fall back to 500 (Internal Server Error).
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.',
  });
};

module.exports = errorHandler;
