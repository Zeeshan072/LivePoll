// ============================================================
// src/context/SocketContext.jsx — Shared Socket.IO Connection
// ============================================================
// PROBLEM this file solves:
//   Socket.IO connects to the server via a persistent WebSocket.
//   If every component created its own connection, we'd have
//   dozens of sockets open — wasteful and hard to manage.
//
// SOLUTION:
//   Create exactly ONE socket. Store it in React Context so any
//   component anywhere in the app can access it without prop drilling.
//
// ── How React Context works (quick primer) ──────────────────
//   1. We create a Context object (SocketContext).
//   2. A "Provider" component wraps the whole app and passes
//      data down through it (the socket + connection status).
//   3. Any child component calls useSocket() to read that data.
//      No props needed — it just works.
//
// ── Exports ─────────────────────────────────────────────────
//   SocketProvider  → wrap your app with this in App.jsx
//   useSocket()     → call this in any component to get the socket
// ============================================================

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// The direct URL of the Socket.IO server.
// We CANNOT use the Vite proxy here because WebSocket upgrades
// need to go directly to the backend, not through the dev proxy.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// ── Create the context ───────────────────────────────────────
// null is the initial value. Any component that calls useSocket()
// outside of a <SocketProvider> will get null and we throw a
// helpful error (see the useSocket function below).
const SocketContext = createContext(null);

// ── SocketProvider ───────────────────────────────────────────
// This component creates the socket connection and provides it
// to all its children via context.
//
// We wrap our entire app in this (in App.jsx), so every page
// and component can access the same socket.
export function SocketProvider({ children }) {
  // useState with a lazy initialiser:
  //   The function inside useState(() => ...) runs ONCE when the
  //   component first mounts, not on every render.
  //   autoConnect: false means we manually call socket.connect()
  //   in the useEffect below. This is the React-recommended pattern
  //   because it works correctly with React's StrictMode (which
  //   mounts components twice in development to catch bugs).
  const [socket] = useState(() =>
    io(SERVER_URL, {
      autoConnect: false,     // don't connect until useEffect runs
      reconnection: true,     // automatically reconnect if server restarts
      reconnectionDelay: 1000, // wait 1 second between reconnect attempts
      reconnectionAttempts: 5, // give up after 5 failed attempts
    })
  );

  // Track whether the socket is currently connected.
  // This is separate from the socket itself because connection
  // status changes trigger re-renders (state), while the socket
  // object itself doesn't change (so it doesn't need to be state).
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // ── Connect to the Socket.IO server ───────────────────
    socket.connect();

    // ── Event listeners ────────────────────────────────────
    // 'connect' fires when the WebSocket handshake succeeds
    const onConnect = () => {
      console.log(`[LivePoll] Socket connected → ${socket.id}`);
      setIsConnected(true);
    };

    // 'disconnect' fires when the connection drops
    const onDisconnect = (reason) => {
      console.log(`[LivePoll] Socket disconnected → ${reason}`);
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // ── Cleanup ────────────────────────────────────────────
    // This runs when the component unmounts (user closes the tab
    // or navigates away). We remove listeners and disconnect
    // cleanly to avoid memory leaks.
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [socket]); // socket never changes (useState), so this runs once

  // Provide the socket and its connection status to all children
  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

// ── useSocket hook ───────────────────────────────────────────
// The easy way for any component to get the socket.
//
// Usage inside any component:
//   const { socket, isConnected } = useSocket();
//   socket.emit('join_poll', { pollId });
//   socket.on('vote_update', (data) => { ... });
//
// Throws a clear error if you forget to wrap with SocketProvider.
export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error(
      '[LivePoll] useSocket() was called outside of <SocketProvider>.\n' +
      'Make sure <SocketProvider> wraps your app in src/App.jsx.'
    );
  }

  return context;
}
