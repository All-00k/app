# 📋 CodeArena Engineering Scratchpad & Master Plan

## 📌 Project Overview
**CodeArena** is a full-stack competitive programming tournament, social networking, and skill acceleration platform for developers. Coders can compete in 1v1 duels, enter topic sprints, track real-time LeetCode solve deltas, climb tier ranks, connect with friends, and receive AI-generated coaching recommendations.

---

## 🛠️ Architecture Summary

```
                       ┌────────────────────────────────────────┐
                       │       CodeArena Frontend App           │
                       │   (React Native Expo + TypeScript)     │
                       └───────────────────┬────────────────────┘
                                           │  REST / JWT Auth
                                           ▼
                       ┌────────────────────────────────────────┐
                       │       Node.js / Express API            │
                       │     (Render: app-blw0.onrender.com)    │
                       └───────────┬────────────────┬───────────┘
                                   │                │
             ┌─────────────────────┴──────┐         │ GraphQL API
             ▼                            ▼         ▼
  ┌──────────────────────┐   ┌──────────────────────────┐
  │ Supabase PostgreSQL  │   │   LeetCode GraphQL API   │
  │ (Cloud DB with RLS)  │   │  (Live Solves & Avatars) │
  └──────────────────────┘   └──────────────────────────┘
```

---

## 🚀 Development Progress Matrix

### Phase 1: Core Battling & Infrastructure (✅ COMPLETED)
- [x] **Express.js API Engine**: Modular MVC architecture with controllers, middleware, and routes.
- [x] **Supabase PostgreSQL Cloud Migration**: Cloud database with tables: `users`, `events`, `event_participants`, `notifications`, `daily_progress`, and `friendships`.
- [x] **JWT & Secure Authentication**: Registration with LeetCode ID validation, bcrypt password hashing, and token persistence.
- [x] **LeetCode GraphQL Integration**: Real-time solve count polling (`Easy`, `Medium`, `Hard`) and delta calculation.
- [x] **Event & Tournament Engine**:
  - **Standard Challenges**: Multi-player group events (1-14 days).
  - **1v1 Duels**: 2-player hard cap with instant combat setup.
  - **Topic Sprints**: Algorithm-focused events (DP, Trees, Arrays, Graphs).
- [x] **Tier Progression & XP Gamification**: 5 competitive ranks from Novice Coder to Grandmaster with animated tier cards.
- [x] **Cloud & Mobile Deployment Configs**: Render web service, Vercel web support, EAS Build for Android/iOS.

### Phase 2: Social Ecosystem & 1v1 AI Comparison (✅ COMPLETED)
- [x] **Friends Management System**:
  - Global user search (`/api/friends/search`) by username, email, or LeetCode handle.
  - Request lifecycle (`/api/friends/request`, `/api/friends/accept`, `/api/friends/reject`).
  - Friends screen (`FriendsScreen.tsx`) with segmented tabs (Friends list, Pending requests, Discover).
- [x] **Friends Circle Standings**:
  - Filtered leaderboard exclusively for connected friends (`/api/friends/leaderboard`).
  - Dual-mode segmented switcher on `BoardScreen.tsx` (Arena Tournaments ⟷ Friends Circle).
  - Top 3 podium display and 1-tap comparison shortcut.
- [x] **1v1 Head-to-Head Comparison (`CompareScreen.tsx`)**:
  - Side-by-side metric comparison (Total score, solve count by difficulty, contest ratings).
  - 10-category DSA topic mastery breakdown (Arrays, Strings, Hash Tables, Trees, Graphs, DP, Math, Bit Manipulation, Two Pointers, Greedy).
- [x] **AI Strategy & Catch-Up Coach Engine**:
  - Dynamic algorithmic analyzer computing exact score gaps and weak topic categories.
  - Tailored action plan with tactical difficulty recommendations.
  - Direct 1-tap "Challenge to 1v1 Duel" button to launch an instant event.

### Phase 3: Multi-Platform Scaling (⏳ NEXT UP)
- [ ] **Multi-Platform Integration**:
  - **HackerRank**: Badges, domain stars, and problem counts.
  - **CodeChef**: Division ratings, stars (1★ to 7★), and contest participation.
  - **GeeksforGeeks**: Coding score, POTD streaks, and institute standings.
  - **Codeforces**: Global contest rating and rank titles.
- [ ] **Unified Developer Power Index (DPI)**:
  - Aggregate multi-platform rating metric blending LeetCode, CodeChef, and GFG.
- [ ] **Multi-Platform Comparison Matrix**:
  - Expanded `CompareScreen` tabs for viewing cross-platform profiles.

### Phase 4: Live Battles & Community Features (🔮 FUTURE ROADMAP)
- [ ] **Live 1v1 Real-Time Code Editor**: WebSocket-backed synchronized duel arena with timed execution.
- [ ] **AI Problem Recommender**: Intelligent daily problem generation targeting user's weakest topics.
- [ ] **Tournament Bracket System**: Single/double elimination brackets for coding clubs and universities.
