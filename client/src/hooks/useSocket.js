// ============================================================
// src/hooks/useSocket.js — Re-export of the useSocket hook
// ============================================================
// The actual hook lives in src/context/SocketContext.jsx.
// This file re-exports it so you have two clean import options:
//
//   Option A (from the context file directly):
//     import { useSocket } from '../context/SocketContext';
//
//   Option B (from the hooks folder — feels more idiomatic):
//     import useSocket from '../hooks/useSocket';
//
// Both are identical. Use whichever you prefer.
// ============================================================

export { useSocket as default } from '../context/SocketContext';
