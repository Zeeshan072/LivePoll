// ============================================================
// src/components/Navbar.jsx — Application Navigation Bar
// ============================================================
// Renders at the top of every page (mounted in App.jsx).
//
// Features:
//   • Brand logo that links back to the home page
//   • "Browse" and "Create Poll" navigation links
//   • A live connection dot that turns green/red based on
//     whether the Socket.IO connection is active — this gives
//     a nice visual confirmation that real-time is working
//
// NavLink vs Link (both from react-router-dom):
//   • Link       — a basic clickable link that changes the URL
//   • NavLink    — same as Link, but also knows if it's the
//                  currently active route, letting us add an
//                  "active" CSS class automatically
// ============================================================

import { NavLink, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

function Navbar() {
  // Get the real-time connection status from our Socket context.
  // isConnected flips to true once the WebSocket handshake
  // succeeds with the backend (usually < 100ms).
  const { isConnected } = useSocket();

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {/* ── Brand / Logo ────────────────────────────────── */}
      {/* Link to="/" takes the user to the home page when clicked */}
      <Link to="/" className="navbar-brand" aria-label="LivePoll home">
        <span className="brand-icon" aria-hidden="true">⚡</span>
        <span className="brand-name">LivePoll</span>
      </Link>

      {/* ── Navigation links ────────────────────────────── */}
      <div className="navbar-links">
        {/* NavLink adds the class "nav-link--active" automatically
            when the current URL matches its `to` prop.
            `end` means ONLY match exactly "/" not "/anything-else" */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'nav-link nav-link--active' : 'nav-link'
          }
        >
          Browse
        </NavLink>

        <NavLink
          to="/create"
          className={({ isActive }) =>
            isActive ? 'nav-link nav-link--active nav-link--create' : 'nav-link nav-link--create'
          }
        >
          + Create Poll
        </NavLink>
      </div>

      {/* ── Real-time connection indicator ──────────────── */}
      {/*  A small dot that shows whether we're connected to
          the Socket.IO server. Green = live, red = offline. */}
      <div
        className={`connection-dot ${isConnected ? 'connection-dot--on' : 'connection-dot--off'}`}
        title={isConnected ? 'Real-time: connected' : 'Real-time: disconnected — updates paused'}
        role="status"
        aria-label={isConnected ? 'Real-time updates active' : 'Real-time updates unavailable'}
      />
    </nav>
  );
}

export default Navbar;
