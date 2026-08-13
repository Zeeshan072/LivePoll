// ============================================================
// src/main.jsx — React App Bootstrap
// ============================================================
// This is the very first JavaScript file that runs in the browser.
// Its only job is to:
//   1. Find the <div id="root"> in index.html
//   2. Mount our React <App /> component into it
//   3. Import the global CSS styles
//
// After this, React takes full control of the page.
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Find the root div in index.html and mount the React app into it
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
