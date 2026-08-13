// ============================================================
// server.js — LivePoll Backend Entry Point
// ============================================================
// This is the first file Node.js runs when we start the server.
// It:
//   1. Loads environment variables from .env
//   2. Creates an Express app (handles HTTP requests)
//   3. Attaches Socket.IO to the same server (handles WebSockets)
//   4. Connects to MongoDB
//   5. Mounts the REST API routes  ← added in Phase 3
//   6. Starts listening for incoming connections
// ============================================================

// Load environment variables FIRST, before anything else
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./config/db');
const pollRoutes = require('./routes/pollRoutes');       // Phase 3
const errorHandler = require('./middleware/errorHandler'); // Phase 3
const initSocketIO = require('./socket/socketHandler');  // Phase 4

// ----------------------------------------------------------
// 1. Create the Express application
// ----------------------------------------------------------
const app = express();

// ----------------------------------------------------------
// 2. Wrap Express in a plain HTTP server.
//    We need this because Socket.IO attaches to the raw HTTP
//    server, not directly to Express.
// ----------------------------------------------------------
const httpServer = http.createServer(app);

// ----------------------------------------------------------
// 3. Create the Socket.IO server and attach it to httpServer.
//    CORS settings here tell Socket.IO which frontend URLs
//    are allowed to connect via WebSocket.
// ----------------------------------------------------------
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ----------------------------------------------------------
// 4. Middleware — runs on every incoming HTTP request
// ----------------------------------------------------------

// Allow requests from our React frontend (CORS)
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));

// Parse incoming JSON request bodies (e.g. when creating a poll)
app.use(express.json());

// Serve static files from public/ (test-socket.html lives here)
// Visit http://localhost:5000/test-socket.html to use the Phase 4 test client
app.use(express.static('public'));

// ── Store io on the Express app object ───────────────────────
// This makes the Socket.IO instance available anywhere we have
// access to req.app — particularly inside our route controllers.
// Usage in a controller: const io = req.app.get('io');
app.set('io', io);

// ----------------------------------------------------------
// 5. Routes
// ----------------------------------------------------------

// Health-check — a simple way to confirm the server is alive
app.get('/', (req, res) => {
  res.json({ message: '🚀 LivePoll API is up and running!' });
});

// Poll routes — all endpoints live under /api/polls
// Express will strip /api/polls from the URL before passing
// the request to pollRoutes, so the router only sees /, /:id, etc.
app.use('/api/polls', pollRoutes);

// ----------------------------------------------------------
// 6. Socket.IO — initialise all event handlers  (Phase 4)
// ----------------------------------------------------------
// initSocketIO registers join_poll, leave_poll, and disconnect
// listeners. The vote_update broadcast is fired from the
// votePoll controller (pollController.js) after each vote.
initSocketIO(io);

// ----------------------------------------------------------
// 7. Global Error Handler
// ----------------------------------------------------------
// MUST be registered AFTER all routes. Express recognises it
// as an error handler because it has 4 parameters (err, req, res, next).
app.use(errorHandler);

// ----------------------------------------------------------
// 8. Connect to MongoDB, then start the server.
//    We connect to the database BEFORE accepting connections
//    so the app is never running without a database.
// ----------------------------------------------------------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n✅ LivePoll server is running!`);
    console.log(`   → Local:  http://localhost:${PORT}`);
    console.log(`   → Press Ctrl+C to stop\n`);
  });
});
