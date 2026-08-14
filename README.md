# ⚡ LivePoll
https://livepoll1.netlify.app/


> A real-time anonymous polling application. Create a poll, share the link, and watch votes roll in live — no account required.

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite | React 18 |
| HTTP client | Axios | 1.x |
| Router | React Router | v7 |
| Backend | Node.js + Express | Express 4 |
| Real-time | Socket.IO | 4.x (server + client) |
| Database | MongoDB Atlas (Mongoose) | Mongoose 8 |

---

## ✨ Features

- **Anonymous poll creation** — no account or login required
- **2–6 poll options** per poll
- **Optional expiry** — polls can be set to close automatically at a future date/time
- **Real-time voting** — vote counts and progress bars update instantly for all connected viewers
- **Creator-only poll closing** — identified via an anonymous browser-stored ID
- **Search polls** — filter the browse list by keyword
- **Status filtering** — show All / Open / Closed polls
- **Shareable poll URLs** — every poll has a permanent link you can copy and send
- **Duplicate-vote prevention** — tracked in the browser's `localStorage` (per poll, per device)
- **Responsive UI** — works on desktop, tablet, and mobile
- **Live connection indicator** — green/red dot in the navbar shows Socket.IO status

---

## 🏗 Architecture

### REST API (HTTP)

```
React (Axios)
      ↓  HTTP requests
Express REST API  (/api/polls/...)
      ↓  Mongoose queries
MongoDB Atlas
```

### Real-time (WebSocket)

```
React (socket.io-client)
      ↕  WebSocket connection
Socket.IO server  (same Express server, different protocol)
      →  broadcasts vote_update / poll_closed to room members
```

A **single** Socket.IO connection is created on app startup in `SocketContext.jsx` and shared across all components via React Context. Individual pages join/leave topic-specific rooms (`poll:<id>`) without creating new connections.

---

## 📁 Project Structure

```
LivePoll/
├── client/                        ← React + Vite frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── pollApi.js         ← All Axios HTTP calls (centralised)
│   │   ├── components/
│   │   │   ├── Navbar.jsx         ← Fixed top bar + connection indicator
│   │   │   ├── PollCard.jsx       ← Poll summary card for Browse page
│   │   │   └── PollOption.jsx     ← Voting option row with progress bar
│   │   ├── context/
│   │   │   └── SocketContext.jsx  ← Shared Socket.IO connection + hook
│   │   ├── hooks/
│   │   │   └── useSocket.js       ← Re-export of useSocket for convenience
│   │   ├── pages/
│   │   │   ├── HomePage.jsx       ← Browse + search + filter polls
│   │   │   ├── CreatePollPage.jsx ← Poll creation form
│   │   │   └── PollDetailPage.jsx ← Voting UI + live results + share
│   │   ├── utils/
│   │   │   └── creatorId.js       ← Anonymous creator ID (localStorage UUID)
│   │   ├── App.jsx                ← Root component + React Router routes
│   │   ├── main.jsx               ← React bootstrap entry point
│   │   └── index.css              ← Global design system (all styles)
│   ├── .env.example               ← Frontend env template (safe to commit)
│   └── vite.config.js             ← Vite + dev proxy config
│
├── server/                        ← Node.js + Express + Socket.IO backend
│   ├── config/
│   │   └── db.js                  ← MongoDB Atlas connection via Mongoose
│   ├── controllers/
│   │   └── pollController.js      ← Business logic for all poll endpoints
│   ├── middleware/
│   │   └── errorHandler.js        ← Global error handler (CastError, ValidationError, etc.)
│   ├── models/
│   │   └── Poll.js                ← Mongoose schema + virtual fields + instance methods
│   ├── routes/
│   │   └── pollRoutes.js          ← Express router mapping URLs → controllers
│   ├── socket/
│   │   └── socketHandler.js       ← Socket.IO join_poll / leave_poll / disconnect
│   ├── .env.example               ← Backend env template (safe to commit)
│   └── server.js                  ← Entry point: Express + Socket.IO + MongoDB
│
├── .gitignore
└── README.md
```

---

## 🔧 Requirements

- **Node.js** v18 or higher — [download here](https://nodejs.org/)
- **MongoDB Atlas** account (free tier works) — [sign up here](https://www.mongodb.com/atlas)
- A modern browser (Chrome, Firefox, Edge, Safari)

---

## ⚙️ Environment Variables

### Backend — `server/.env`

Copy `server/.env.example` to `server/.env` and fill in your values:

```env
# Port the backend server runs on
PORT=5000

# Your MongoDB Atlas connection string
# Get it from: Atlas → Your Cluster → Connect → Drivers
MONGO_URI=your_mongodb_connection_string_here

# The URL of your React frontend (for CORS)
# Development: http://localhost:5173
# Production:  https://your-netlify-app.netlify.app
CLIENT_URL=http://localhost:5173
```

### Frontend — `client/.env`

Copy `client/.env.example` to `client/.env` (no real secrets go here):

```env
# The base URL for Axios REST API calls
# In development this proxies through Vite → no CORS issues
VITE_API_URL=/api

# The direct URL for the Socket.IO WebSocket connection
# Must point directly to the backend (WebSockets bypass the Vite proxy)
VITE_SERVER_URL=http://localhost:5000
```

> ⚠️ **Never commit `.env` files**. The `.gitignore` already excludes them.  
> ✅ **`.env.example` files are safe** — they contain only placeholders.

---

## 🚀 Running Locally

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd LivePoll
```

### 2. Set up the backend

```bash
cd server
cp .env.example .env
# Open .env and add your MONGO_URI from MongoDB Atlas
npm install
npm run dev
```

The backend starts at: **http://localhost:5000**

### 3. Set up the frontend (new terminal)

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The React app starts at: **http://localhost:5173**

Open `http://localhost:5173` in your browser. The green dot in the navbar confirms the real-time connection is working.

---

## 📡 API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check — confirms server is running |
| `GET` | `/api/polls` | Get all polls (supports `?search=text&status=open\|closed`) |
| `GET` | `/api/polls/:id` | Get a single poll by ID |
| `POST` | `/api/polls` | Create a new poll |
| `POST` | `/api/polls/:id/vote` | Vote on a poll option |
| `PATCH` | `/api/polls/:id/close` | Close a poll (creator only) |

### Request/Response examples

**Create a poll** — `POST /api/polls`
```json
{
  "question": "What is the best JavaScript framework?",
  "options": ["React", "Vue", "Svelte"],
  "creatorId": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2026-12-31T23:59:00.000Z"
}
```

**Vote** — `POST /api/polls/:id/vote`
```json
{ "optionId": "64a1b2c3d4e5f6789012345a" }
```

**Close poll** — `PATCH /api/polls/:id/close`
```json
{ "creatorId": "550e8400-e29b-41d4-a716-446655440000" }
```

### Error responses

| Scenario | HTTP Status |
|---|---|
| Invalid MongoDB ID format | `400 Bad Request` |
| Poll not found | `404 Not Found` |
| Voting on a closed poll | `400 Bad Request` |
| Wrong creator closes poll | `403 Forbidden` |
| Schema validation failure | `400 Bad Request` |

---

## 🔌 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_poll` | `{ pollId }` | Client joins the room for a specific poll. Enables receiving vote and close events for that poll. |
| `leave_poll` | `{ pollId }` | Client leaves the room when navigating away from a poll page. |

### Server → Client (broadcast to room members)

| Event | Payload | Description |
|---|---|---|
| `vote_update` | `{ pollId, options, totalVotes }` | Sent to everyone viewing a poll after a vote is recorded. Contains the fresh vote counts for all options. |
| `poll_closed` | `{ pollId }` | Sent to everyone viewing a poll when the creator closes it. Triggers the UI to disable voting. |

Socket rooms are named `poll:<pollId>` (e.g. `poll:6890a1b2c3d4e5f678901234`).

---

## 🔐 Design & Security Notes

### Anonymous identity
There are no user accounts. When you first visit the app, a UUID is generated and saved in your browser's `localStorage` as your `creatorId`. This ID is attached to polls you create, allowing you to close them later without logging in.

**Limitation**: If you clear browser storage, switch browsers, or use incognito, the identity is lost.

### Atomic voting
Vote counts are incremented using MongoDB's `$inc` operator in a single database operation. This prevents race conditions where two votes submitted simultaneously might overwrite each other.

### Creator verification
Poll closing is guarded by comparing the `creatorId` from the HTTP request against the `creatorId` stored on the poll document when it was created. If they don't match, the server returns `403 Forbidden`.

### Duplicate vote prevention
The frontend tracks whether the current browser has already voted on each poll by storing the chosen option ID in `localStorage` (key: `livepoll_voted_<pollId>`). Vote buttons are hidden once a vote is recorded. The backend does not enforce this — it will accept additional votes if the localStorage record is cleared.

### Environment variables
Real credentials (`MONGO_URI`, etc.) live only in `.env` files which are excluded from Git. Source code never contains hardcoded secrets. `VITE_` prefixed variables are exposed to the browser — only public configuration (API URLs) goes there.

---

## 🚢 Deployment Guide

| Service | Role | How |
|---|---|---|
| **MongoDB Atlas** | Database | Create a cluster (free M0 tier works). Whitelist Render's outbound IPs or use 0.0.0.0/0 for initial testing. |
| **Render** | Backend | Create a Web Service. Set `Build Command: npm install`, `Start Command: node server.js`. Add environment variables in the Render dashboard. |
| **Netlify** | Frontend | Connect your repo. Set `Build command: npm run build`, `Publish directory: dist`. Set `VITE_SERVER_URL` and `VITE_API_URL` to your Render backend URL. |

After deploying the backend, update:
- `CLIENT_URL` in Render → set to your Netlify URL (e.g. `https://livepoll-app.netlify.app`)
- `VITE_SERVER_URL` in Netlify → set to your Render URL (e.g. `https://livepoll-api.onrender.com`)
- `VITE_API_URL` in Netlify → set to `https://livepoll-api.onrender.com/api`

---

## 🔭 Future Improvements

These features are not implemented but could be added:

- **Authentication** — allow users to register and log in for persistent identity
- **Rate limiting** — prevent voting bots and API abuse (e.g. with `express-rate-limit`)
- **Server-side duplicate vote protection** — track voted IPs or session tokens in the database
- **Poll analytics** — view voting trends and timestamps
- **Poll moderation** — flagging and removing inappropriate polls
- **Multiple-choice voting** — allow selecting more than one option
- **Comments** — let users leave comments on polls
- **Notifications** — email/push alerts when a poll is about to expire
- **Admin panel** — for managing all polls from a dashboard

---

## 📄 License

No license has been applied to this project yet. A license (e.g. MIT) can be added in a future update.
