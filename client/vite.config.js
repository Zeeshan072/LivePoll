// ============================================================
// vite.config.js — Vite configuration for the React frontend
// ============================================================
// This file configures the Vite development server.
//
// The most important setting here (for development) is the
// `proxy` block inside `server`. It tells the Vite dev server:
//
//   "Any request that starts with /api should be forwarded
//    to http://localhost:5000 (our Express backend)."
//
// This means in our React code, we can write:
//   axios.get('/api/polls')
// instead of:
//   axios.get('http://localhost:5000/api/polls')
//
// It also avoids CORS issues during development because the
// browser sees all requests going to the same origin.
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173, // React app runs on this port in development

    proxy: {
      // Forward any request starting with /api to our backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
