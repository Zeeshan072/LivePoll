// ============================================================
// socket/socketHandler.js — Socket.IO Event Handlers
// ============================================================
// This file sets up all the real-time communication logic.
// It exports one function: initSocketIO(io)
//
// Call it once in server.js, passing in the Socket.IO server
// instance. It then registers all the event listeners.
//
// ── What is a "room"? ────────────────────────────────────────
// A Socket.IO room is like a private group chat channel.
// When a browser opens a poll, it "joins" a room named after
// that poll's ID. When a vote happens, the server "broadcasts"
// the new vote counts ONLY to sockets in that room — not to
// everyone connected to the server.
//
// Room naming convention we use: "poll:<pollId>"
//   e.g. "poll:6890a1b2c3d4e5f678901234"
//
// ── Events this file handles ─────────────────────────────────
//
//  Client → Server:
//   join_poll   { pollId }  → socket joins that poll's room
//   leave_poll  { pollId }  → socket leaves that poll's room
//
//  Server → Clients (emitted from pollController.js, not here):
//   vote_update { pollId, options, totalVotes }
//               → broadcast to everyone in the poll's room
// ============================================================

const initSocketIO = (io) => {
  io.on('connection', (socket) => {
    // A new browser tab / client has connected via WebSocket
    console.log(`⚡ [Socket] Connected    → ${socket.id}`);

    // ── join_poll ─────────────────────────────────────────────
    // Emitted by the React client when a user opens a poll page.
    // We put this socket into a room so it will receive future
    // vote_update broadcasts for this specific poll.
    //
    // socket.join(room) is non-destructive — the socket can be
    // in multiple rooms at once (e.g. if the user opens two polls
    // in different tabs, each tab is a separate socket).
    socket.on('join_poll', ({ pollId }) => {
      if (!pollId) return; // ignore malformed events

      const room = `poll:${pollId}`;
      socket.join(room);

      console.log(`📌 [Socket] ${socket.id} → joined  room [${room}]`);
      console.log(`   Room now has ${io.sockets.adapter.rooms.get(room)?.size ?? 0} viewer(s)`);
    });

    // ── leave_poll ────────────────────────────────────────────
    // Emitted when a user navigates away from the poll page.
    // This is a clean teardown — the socket stops receiving
    // vote_update events for this poll.
    //
    // Note: Socket.IO also automatically removes a socket from
    // ALL its rooms when it disconnects. The leave_poll event
    // is for when the user is still connected but navigates away.
    socket.on('leave_poll', ({ pollId }) => {
      if (!pollId) return;

      const room = `poll:${pollId}`;
      socket.leave(room);

      console.log(`🚪 [Socket] ${socket.id} → left    room [${room}]`);
    });

    // ── disconnect ────────────────────────────────────────────
    // Fired automatically when the browser tab closes, the user
    // loses internet connection, or navigates to a different site.
    // Socket.IO cleans up room membership automatically.
    socket.on('disconnect', (reason) => {
      console.log(`❌ [Socket] Disconnected → ${socket.id} (reason: ${reason})`);
    });
  });
};

module.exports = initSocketIO;
