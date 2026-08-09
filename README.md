# CodeArena - Competitive LeetCode Battling Platform

CodeArena is a full-stack, cross-platform mobile and web application built with React Native (Expo), an Express.js API server, and Supabase PostgreSQL. It enables developers to register with their LeetCode ID, compete in timed multi-day coding events or 1v1 duels, track daily progress, climb tier rankings, and sync live problem-solving data from LeetCode.

---

## Features and Highlights

### 1. Multiple Challenge Modes
- **Standard Challenge**: Multi-player group events (1 to 14 days) with dynamic leaderboards.
- **1v1 Duel Mode**: Fast 24-hour head-to-head battle capped strictly at 2 participants for direct rival combat.
- **Topic Sprint**: Algorithm-focused sprints targeting specific topics (Dynamic Programming, Graph / Trees, Arrays & Strings, SQL & Databases).

### 2. Tier-Based Reward and XP System
Users earn XP (10 XP per point) and climb competitive ranks based on global performance:
- **Novice Coder** (0 - 49 pts)
- **Code Warrior** (50 - 199 pts)
- **Algo Master** (200 - 499 pts)
- **Elite Architect** (500 - 999 pts)
- **Grandmaster** (1000+ pts)

### 3. Automated LeetCode Sync and Scoring
- **Automated GraphQL Polling**: Fetches live LeetCode stats (Easy, Medium, Hard solves, profile avatar).
- **Delta Scoring System**: Tracks problems solved after joining an event:
  - **Easy**: 1 Point
  - **Medium**: 3 Points
  - **Hard**: 5 Points
- **Daily Progress Tracking**: Logs daily solved questions for trend analysis and historical charts.

### 4. Cohesive UI/UX Design
- Cohesive light theme with Dark Teal (`#0D3B39`) branding and Mint Green (`#2DD4A8`) accents.
- Smooth transitions, micro-animations, custom badge pills, and tier progression bars.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React Native, Expo, TypeScript, React Navigation, Axios |
| **Backend** | Node.js, Express.js, JWT Authentication, Bcrypt |
| **Database** | Supabase PostgreSQL (`@supabase/supabase-js`) |
| **External API** | LeetCode GraphQL API (`https://leetcode.com/graphql/`) |

---

## Project Folder Structure

```
d:/APP/
├── backend/                  # Express.js REST API Server
│   ├── src/
│   │   ├── config/           # Environment variables and constants
│   │   ├── controllers/      # Auth, Event, Sync and Notification controllers
│   │   ├── middleware/       # JWT Authentication middleware
│   │   ├── routes/           # Express API routers (auth, events, sync, rankings, notifications)
│   │   ├── utils/            # Tier calculation helpers
│   │   ├── database.js       # Supabase database client and connection verification
│   │   ├── leetcode.js       # LeetCode GraphQL fetcher and scoring logic
│   │   └── server.js         # Express server bootstrap and cron updates
│   ├── supabase_schema.sql   # Supabase SQL Schema for tables, indexes and RLS policies
│   ├── .env.example          # Template for backend environment variables
│   └── package.json
│
├── supabase_schema.sql       # Root Supabase SQL Schema setup script
├── src/                      # React Native Mobile Application
│   ├── components/           # Reusable UI components (EventCard, TierCard, BadgePill)
│   ├── context/              # Global AuthContext and JWT persistence
│   ├── navigation/           # Tab and Stack AppNavigators
│   ├── screens/              # Auth, Home, Board, Profile, CreateEvent, JoinEvent, EventDetail
│   ├── services/             # Dynamic Axios API service client
│   ├── types/                # TypeScript interfaces and types
│   └── utils/                # Theme colors, fonts, and styles
│
├── App.tsx                   # React Native entry point
└── package.json
```

---

## API Endpoints Summary

### Auth Endpoints
- `POST /api/auth/register` - Register a new user with unique email, username, password and LeetCode ID.
- `POST /api/auth/login` - Authenticate user (by email or username) and receive JWT.
- `GET  /api/auth/profile` - Fetch active user profile and tier rank.

### Event Endpoints
- `POST /api/events` - Create a new challenge (Standard, 1v1 Duel, or Topic Sprint).
- `GET  /api/events` - List joined events for the authenticated user.
- `POST /api/events/join` - Join an event using a unique invite code.
- `GET  /api/events/:id` - Get detailed event information.
- `GET  /api/events/:id/leaderboard` - Fetch live event leaderboard.
- `GET  /api/events/:eventId/progress/:userId` - Fetch daily progress breakdown.

### Sync and Ranking Endpoints
- `POST /api/sync/:userId` - Sync user's latest LeetCode stats.
- `POST /api/sync/event/:eventId` - Batch sync all participants in an event.
- `GET  /api/rankings` - Global platform leaderboard.
- `GET  /api/notifications` - Activity feed alerts.
- `GET  /api/health` - System health check.

---

## How to Run Locally

### 1. Configure Supabase and Backend Server
```bash
cd backend
npm install
```
Create `backend/.env` with your Supabase credentials:
```env
PORT=3001
JWT_SECRET=your_jwt_secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
Run `supabase_schema.sql` in your Supabase SQL Editor, then start the server:
```bash
node src/server.js
```
Server will start on `http://localhost:3001`.

### 2. Start the React Native Frontend
```bash
npm install
npx expo start
```
- Press `w` to open in Web browser (`http://localhost:8081`).
- Scan the QR Code with Expo Go on your mobile device (iOS/Android) to test on a physical phone.

---

## License
This project is open-source under the MIT License.
