// ============================================================
// src/App.jsx — Root React Component
// ============================================================
// This is the top-level component that assembles the entire app.
// It does three important things:
//
//   1. SOCKET PROVIDER  — wraps everything in <SocketProvider>
//      so any component can access the shared Socket.IO
//      connection via useSocket() without prop drilling.
//
//   2. ROUTER — wraps everything in <BrowserRouter> so React
//      Router can read the current URL and decide which page
//      component to render.
//
//   3. ROUTES — maps each URL path to its page component:
//        /              → <HomePage>
//        /create        → <CreatePollPage>
//        /poll/:id      → <PollDetailPage>  (":id" is dynamic)
//        anything else  → <NotFoundPage>
//
// Layout structure (every page sees):
//   <SocketProvider>
//     <BrowserRouter>
//       <Navbar />          ← fixed top bar (always visible)
//       <Routes>            ← only ONE child renders at a time
//         <Route ... />
//       </Routes>
//     </BrowserRouter>
//   </SocketProvider>
// ============================================================

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import CreatePollPage from './pages/CreatePollPage';
import PollDetailPage from './pages/PollDetailPage';

// ── 404 Page ─────────────────────────────────────────────────
// Shown when the URL doesn't match any known route.
// Defined inline here because it's small and won't change.
function NotFoundPage() {
  return (
    <main className="page">
      <div className="page-hero">
        <div className="page-hero__icon">🔍</div>
        <h1 className="page-hero__title">Page Not Found</h1>
        <p className="page-hero__subtitle">
          The URL you entered doesn&apos;t exist. Check for typos or
          head back to browse all polls.
        </p>
        <Link to="/" className="btn btn--primary">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}

// ── App ───────────────────────────────────────────────────────
function App() {
  return (
    /*
     * SocketProvider must be the outermost wrapper so that even
     * the Navbar (which shows the connection dot) can call useSocket().
     * If Navbar were outside SocketProvider, useSocket() would throw.
     */
    <SocketProvider>
      {/*
       * BrowserRouter listens to the browser's address bar.
       * When the URL changes (e.g. user clicks a Link), it tells
       * <Routes> to swap out the rendered page component.
       */}
      <BrowserRouter>
        {/* Navbar renders on every page because it's outside <Routes> */}
        <Navbar />

        {/*
         * <Routes> looks at the current URL and renders the FIRST
         * <Route> whose path matches. Only ONE route renders at a time.
         */}
        <Routes>
          {/* Home / Browse page */}
          <Route path="/" element={<HomePage />} />

          {/* Create Poll page */}
          <Route path="/create" element={<CreatePollPage />} />

          {/*
           * Poll Detail page — ":id" is a URL parameter.
           * If someone visits /poll/6890a1b2c3d4e5f678901234,
           * PollDetailPage renders and useParams() gives { id: "6890..." }
           */}
          <Route path="/poll/:id" element={<PollDetailPage />} />

          {/*
           * Catch-all: matches any URL that didn't match above.
           * path="*" is the React Router convention for 404 pages.
           */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
