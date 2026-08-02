# 🏆 CodeArena — Competitive LeetCode Battling App

**CodeArena** is a full-stack, cross-platform mobile application built with **React Native (Expo)** and an **Express.js API server**. It allows developers to register with their **LeetCode ID**, compete in timed multi-day coding events or 1v1 duels, track daily progress, climb tier rankings, and sync live problem-solving data from LeetCode.

---

## ✨ Features & Highlights

### 🎮 1. Multiple Challenge Modes
- **🏆 Standard Challenge**: Multi-player group events (1 to 14 days) with dynamic leaderboards.
- **⚔️ 1v1 Duel Mode**: Fast 24-hour head-to-head battle capped at **2 players** for direct rival combat.
- **🏷️ Topic Sprint**: Algorithm-focused sprints targeting specific topics (*Dynamic Programming*, *Graph / Trees*, *Arrays & Strings*, *SQL & Databases*).

### 🎖️ 2. Tier-Based Reward & XP System
Users earn **XP** (10 XP per point) and climb competitive ranks based on global performance:
- 🥉 **Novice Coder** (0 – 49 pts)
- 🥈 **Code Warrior** (50 – 199 pts)
- 🥇 **Algo Master** (200 – 499 pts)
- 💎 **Elite Architect** (500 – 999 pts)
- 👑 **Grandmaster** (1000+ pts)

### 📊 3. Automated LeetCode Sync & Scoring
- **Automated GraphQL Polling**: Fetches live LeetCode stats (Easy, Medium, Hard solves, profile avatar).
- **Delta Scoring System**: Tracks problems solved *after* joining an event:
  - 🟢 **Easy**: `1 Point`
  - 🟡 **Medium**: `3 Points`
  - 🔴 **Hard**: `5 Points`
- **Daily Progress Tracking**: Logs daily solved questions for trend analysis and historical charts.

### 🎨 4. Stitch-Inspired UI/UX
- Cohesive light theme with Dark Teal (`#0D3B39`) branding and Mint Green (`#2DD4A8`) accents.
- Smooth transitions, micro-animations, custom badge pills, and tier progression bars.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native, Expo, TypeScript, React Navigation, Axios |
| **Backend** | Node.js, Express.js, JWT Authentication, Bcrypt |
| **Database** | `sql.js` (Portable Pure-JS SQLite implementation) |
| **External API** | LeetCode GraphQL API (`https://leetcode.com/graphql/`) |

---

## 📁 Project Folder Structure

```
d:\APP/
├── backend/                  # Express.js REST API Server
│   ├── src/
│   │   ├── config/           # Environment variables & constants
│   │   ├── controllers/      # Auth, Event, and Sync controllers
│   │   ├── middleware/       # JWT Authentication middleware
│   │   ├── routes/           # Express API routers (auth, events, sync, rankings)
│   │   ├── utils/            # Tier calculation helpers
│   │   ├── database.js       # SQLite connection & schema definitions
│   │   ├── leetcode.js       # LeetCode GraphQL fetcher & scoring logic
│   │   └── server.js         # Express server bootstrap & cron updates
│   ├── codearena.db          # SQLite Database file
│   └── package.json
│
├── src/                      # React Native Mobile Application
│   ├── components/           # Reusable UI components (EventCard, TierCard, BadgePill)
│   ├── context/              # Global AuthContext & JWT persistence
│   ├── navigation/           # Tab and Stack AppNavigators
│   ├── screens/              # Auth, Home, Board, Profile, CreateEvent, JoinEvent, EventDetail
│   ├── services/             # Dynamic Axios API service client
│   ├── types/                # TypeScript interfaces & types
│   └── utils/                # Theme colors, fonts, & styles
│
├── App.tsx                   # React Native entry point
└── package.json
```

---

## 🔌 API Endpoints Summary

### Auth Endpoints
- `POST /api/auth/register` — Register a user with LeetCode ID & password.
- `POST /api/auth/login` — Authenticate user and receive JWT.
- `GET  /api/auth/profile` — Fetch active user profile and tier rank.

### Event Endpoints
- `POST /api/events` — Create a new challenge (Standard, 1v1 Duel, or Topic Sprint).
- `GET  /api/events` — List joined events for the authenticated user.
- `POST /api/events/join` — Join an event using a unique invite code.
- `GET  /api/events/:id` — Get detailed event information.
- `GET  /api/events/:id/leaderboard` — Fetch live event leaderboard.
- `GET  /api/events/:eventId/progress/:userId` — Fetch daily progress breakdown.

### Sync & Ranking Endpoints
- `POST /api/sync/:userId` — Sync user's latest LeetCode stats.
- `POST /api/sync/event/:eventId` — Batch sync all participants in an event.
- `GET  /api/rankings` — Global platform leaderboard.
- `GET  /api/health` — System health check.

---

## 🚀 How to Run Locally

### 1. Start the Backend Server
```bash
cd backend
npm install
node src/server.js
```
*Server will start on `http://localhost:3001` (and automatically broadcast on local Wi-Fi IP).*

### 2. Start the React Native Frontend
```bash
# In the root project directory
npm install
npx expo start
```
- Press **`w`** to open in Web browser (`http://localhost:8081`).
- Scan the **QR Code** with **Expo Go** on your mobile device (iOS/Android) to test on a physical phone.

---

## 📜 License
This project is open-source under the **MIT License**.
