// ============================================================
// src/api/pollApi.js — All REST API Calls to the Backend
// ============================================================
// This file is the single place in the frontend where we talk
// to our Express server over HTTP.
//
// Why centralise API calls here?
//   • If the backend URL ever changes, update ONE file, not 10.
//   • Every component imports clean named functions instead of
//     writing fetch/axios calls inline.
//   • Easy to add request interceptors (e.g. auth headers) later.
//
// We use Axios — a library that makes HTTP requests simpler than
// the browser's built-in fetch(). Key benefits:
//   • Automatically parses JSON responses
//   • Throws errors for non-2xx status codes (fetch doesn't)
//   • Easy to create a pre-configured "instance"
// ============================================================

import axios from 'axios';

// ── Create a pre-configured Axios instance ──────────────────
// baseURL:  Every request is relative to this.
//           VITE_API_URL is set to '/api' in client/.env,
//           which Vite proxies to http://localhost:5000/api.
//           So axios.get('/polls') → GET http://localhost:5000/api/polls
//
// headers:  We're always sending and expecting JSON.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Poll API functions ───────────────────────────────────────
// Each function returns a Promise that resolves with the
// Axios response object. In your component you'll do:
//   const response = await getAllPolls();
//   const polls = response.data.data; // { success, count, data }

// GET /api/polls
// Optional params: { search: 'text', status: 'open' | 'closed' }
export const getAllPolls = (params = {}) =>
  api.get('/polls', { params });

// GET /api/polls/:id
export const getPollById = (id) =>
  api.get(`/polls/${id}`);

// POST /api/polls
// data: { question, options: string[], creatorId, expiresAt? }
export const createPoll = (data) =>
  api.post('/polls', data);

// POST /api/polls/:id/vote
// optionId: the MongoDB _id of the option subdocument
export const votePoll = (id, optionId) =>
  api.post(`/polls/${id}/vote`, { optionId });

// PATCH /api/polls/:id/close
// creatorId: must match the creatorId stored on the poll
export const closePoll = (id, creatorId) =>
  api.patch(`/polls/${id}/close`, { creatorId });

export default api;
