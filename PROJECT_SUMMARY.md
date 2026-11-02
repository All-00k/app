# ⚔️ CodeArena — Complete Engineering & Feature Summary

**CodeArena** is a full-stack, gamified competitive programming arena and social platform designed to turn algorithm practice into an engaging, multi-player sport. It tracks, aggregates, and visualizes developer performance across **LeetCode**, **Codeforces**, **CodeChef**, **GeeksforGeeks**, and **HackerRank** into a unified **Global Developer Power Index (DPI)**.

---

## 📑 Table of Contents
1. [Tech Stack & Architecture](#-tech-stack--architecture)
2. [Phase 1: Core Competition & Gamification](#-phase-1-core-competition--gamification)
3. [Phase 2: Social Graph, 1v1 Duels & AI Coach](#-phase-2-social-graph-1v1-duels--ai-coach)
4. [Phase 3: Multi-Platform Scaling & Global DPI](#-phase-3-multi-platform-scaling--global-dpi)
5. [Database Schema & Backend API Catalog](#-database-schema--backend-api-catalog)
6. [Frontend Screen & Component Structure](#-frontend-screen--component-structure)
7. [Automated Verification & Test Suite](#-automated-verification--test-suite)
8. [Future Roadmap (Phase 4)](#-future-roadmap-phase-4)

---

## 🛠️ Tech Stack & Architecture

### Frontend (Mobile & Web)
* **Framework**: React Native with Expo (TypeScript)
* **Navigation**: React Navigation (Bottom Tabs + Native Stack)
* **Styling & UI**: Custom dark-mode design system with high-contrast neon accents, glassmorphism, and micro-animations via `ScalePressable`
* **Icons**: `@expo/vector-icons` (Ionicons)
* **State & Networking**: Axios API client with automatic JWT bearer token injection & SecureStorage

### Backend
* **Runtime**: Node.js & Express.js
* **Database**: Supabase PostgreSQL (with cloud connection pooling & Row Level Security)
* **Authentication**: JWT (JSON Web Tokens) with 30-day persistence + bcrypt password hashing
* **Scraping & Integration**: Axios & Cheerio for resilient multi-platform profile extraction and official platform REST/GraphQL APIs
* **Push Notifications**: Expo Server SDK integration

---

## 🏆 Phase 1: Core Competition & Gamification

### 1. 🔐 Authentication & Onboarding
* **Multi-Identifier Registration**: Users sign up with username, email, password, and their primary LeetCode ID.
* **Instant Account Verification**: The system verifies the LeetCode handle in real-time, fetching avatar, baseline solve counts, and initializing user XP.
* **Security**: Passwords salted and hashed with `bcryptjs`, authenticated routes protected by JWT middleware.

### 2. ⚡ LeetCode Problem Scraping & Dynamic Scoring
* **Scraping Engine**: Fetches Easy, Medium, and Hard solve distributions from LeetCode.
* **Weighted Point System**:
  $$\text{LeetCode Score} = (\text{Easy} \times 1) + (\text{Medium} \times 3) + (\text{Hard} \times 5)$$
* **Tier Progression Ladder**:
  * 🟢 **Novice Coder** (<50 pts)
  * 🔵 **Code Warrior** (50–149 pts)
  * 🟣 **Algorithm Master** (150–299 pts)
  * 🟡 **Elite Architect** (300–499 pts)
  * 🔴 **Grandmaster** (500+ pts)

### 3. 🎯 Arena Tournaments & Events
* **Game Modes**:
  * **Standard Battle**: Open multi-player sprint over customizable duration (3, 7, 14, or 30 days).
  * **1v1 Duel**: Direct head-to-head combat between two competitors.
  * **Topic Sprint**: Focused challenge targeting specific DSA categories (e.g. Dynamic Programming, Graph Algorithms).
* **Invite Codes**: Automatic 8-character cryptographic invite codes for private lobby access.
* **Live Event Sync & Daily Tracking**: Tracks solve delta per participant from the moment of joining, populating `daily_progress` snapshots.

---

## 👥 Phase 2: Social Graph, 1v1 Duels & AI Coach

### 1. 🌐 Social Graph & Discovery
* **User Discovery**: Real-time debounce search (`/api/friends/search`) finding users across usernames, LeetCode handles, and emails.
* **Friendship Lifecycle**: Send requests, list incoming/outgoing requests with badge counts, accept, decline, and remove friends.
* **Mutual Request Auto-Accept**: Sending a request to a user who already requested you instantly accepts the friendship.

### 2. 🏅 Friends Circle Leaderboard
* Dedicated social leaderboard tab ranking exclusively connected friends against each other.
* Top 3 Friends Podium displaying custom avatars, score differentials, and direct 1-tap comparison links.

### 3. ⚔️ Head-to-Head 1v1 Comparison Engine (`CompareScreen.tsx`)
* **Difficulty Breakdown**: Side-by-side bars for Easy, Medium, Hard, and Total solves with win indicators.
* **10 DSA Category Mastery**: Compares solve counts across *Arrays, Strings, Hash Tables, Dynamic Programming, Trees, Graphs, Math, Bit Manipulation, Two Pointers, Greedy*.
* **Lead / Deficit Metrics**: Real-time score delta highlighting the current leader.

### 4. 🧠 AI Catch-Up Assistant & Battle Coach
* **Dynamic Strategic Assessment**: Analyzes the competitor’s strengths vs. opponent weaknesses.
* **Algorithmic Overtake Plans**:
  * Calculates precise daily solve formulas (e.g. *"Solve 2 Hard + 1 Medium problem daily for 3 days to overtake rival"*).
  * Recommends high-yield DSA categories where the opponent is weakest.
* **1-Tap Duel Challenge**: Instantly provisions a 1v1 Duel event against the selected friend.

---

## 🌐 Phase 3: Multi-Platform Scaling & Global DPI

### 1. 🔌 Multi-Platform Scrapers & Parsers (`backend/src/platforms.js`)
* **Codeforces**: Official API integration fetching contest rating, max rating, rank title (e.g. *Legendary Grandmaster*), and solved problem counts from submission history.
* **CodeChef**: Extracts stars division (1★ to 7★), global contest rating, and total practice problems solved.
* **GeeksforGeeks (GFG)**: Extracts overall coding score, Problem of the Day (POTD) streaks, and institute standings.
* **HackerRank**: Fetches developer level, domain star badges, and problem counts.

### 2. ⚡ Global Developer Power Index (DPI)
A unified formula standardizing cross-platform metrics into a single power rating:
$$\text{DPI} = (\text{LeetCode Score} \times 10) + (\text{CF Rating} \times 3.5 + \text{CF Solved} \times 0.5) + (\text{CC Rating} \times 2.8 + \text{Stars} \times 200) + (\text{GFG Score} \times 1.2 + \text{Streak} \times 15) + (\text{HR Level} \times 80 + \text{Badges} \times 40)$$

**Dynamic DPI Tier Hierarchy:**
* 👑 **Legendary Titan** (12,000+ DPI)
* 💎 **Diamond Grandmaster** (8,000+ DPI)
* 🏆 **Master Architect** (5,000+ DPI)
* 🥇 **Gold Specialist** (3,000+ DPI)
* 🥈 **Silver Coder** (1,500+ DPI)
* 🥉 **Bronze Developer** (<1,500 DPI)

### 3. 📱 UI & Screen Overhauls
* **`ProfileScreen.tsx`**:
  * **DPI Hero Card**: Displays total unified score, tier badge emoji, and proportional contribution breakdown chips per platform.
  * **Connected Platforms Grid**: Real-time linked status with one-tap handle verification modal.
  * **One-Tap "Sync All"**: Simultaneously refreshes stats across all 5 platforms.
* **`CompareScreen.tsx`**:
  * **Dual-Tab Switcher**: Toggle between **"LeetCode DSA"** and **"Multi-Platform Matrix"**.
  * **Cross-Platform Dominance Counter**: Visual victory tally (e.g. *🏆 Leading 3 vs 1*).
  * **Side-by-Side Platform Clash Cards**: Compares ratings, stars, and badges per platform with proportional visual progress bars.
  * **Multi-Platform AI Battle Coach**: Tailored tactical advice based on cross-platform advantages.
* **`BoardScreen.tsx`**:
  * **3-Way Switcher**: **Tournaments** | **Friends Circle** | **Global DPI**.
  * **Global DPI Standings**: Grandmasters podium and full table with global ranks, scores, tier tags, and platform icons.

---

## 🗄️ Database Schema & Backend API Catalog

### Supabase Tables
| Table | Description |
|---|---|
| `users` | User credentials, LeetCode stats, external platform handles (`codeforces_id`, `codechef_id`, `gfg_id`, `hackerrank_id`), `dpi_score`, `dpi_tier`, and `platform_stats` JSONB |
| `events` | Arena tournaments, game modes (`battle`, `duel`, `sprint`), invite codes, durations |
| `event_participants` | Participant join snapshots, current scores, and real-time tournament rank |
| `daily_progress` | Historical day-by-day problem solves and daily score contributions |
| `friendships` | Social graph edges (`user_id`, `friend_id`, `status`: pending/accepted) |
| `notifications` | Event alerts, solve triggers, and friend request notifications |

### API Endpoints
* **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`
* **Sync**: `POST /api/sync/:userId`, `POST /api/sync/event/:eventId`
* **Events**: `GET /api/events`, `POST /api/events`, `POST /api/events/join`, `GET /api/events/:id`, `GET /api/events/:id/leaderboard`, `GET /api/events/:id/progress/:userId`
* **Friends**: `GET /api/friends`, `GET /api/friends/leaderboard`, `GET /api/friends/search`, `POST /api/friends/request`, `GET /api/friends/requests`, `POST /api/friends/accept`, `POST /api/friends/reject`, `DELETE /api/friends/:friendId`, `GET /api/friends/compare/:friendId`
* **Multi-Platform**: `GET /api/platforms`, `POST /api/platforms/link`, `POST /api/platforms/sync`, `DELETE /api/platforms/:platform`, `GET /api/platforms/leaderboard`
* **Notifications**: `GET /api/notifications`, `POST /api/notifications/push-token`

---

## 🧪 Automated Verification & Test Suite

The complete system is covered by an automated test suite (`backend/test_all_features.js`):

```
================================================================
🚀 CODEARENA FULL SYSTEM END-TO-END TEST SUITE
================================================================

📡 1. SERVER HEALTH & DATABASE CONNECTIVITY
  ✅ [PASS] Health Check Endpoint -> Database: connected

🔐 2. AUTHENTICATION & USER IDENTITY
  ✅ [PASS] User 1 Identified -> ID: 3, Username: @All-00k
  ✅ [PASS] User 2 Identified -> ID: 7, Username: @coderB_88878
  ✅ [PASS] Get Authenticated Profile -> Tier: Code Warrior

🔄 3. LEETCODE SCRAPING & STATS SYNCHRONIZATION
  ✅ [PASS] Live LeetCode Sync -> Easy: 42, Med: 23, Hard: 5, Score: 136 pts

🏆 4. ARENA EVENTS & TOURNAMENTS
  ✅ [PASS] Create Battle Event -> Code: 371EBF6B, Mode: duel
  ✅ [PASS] List Events -> Total Events: 2
  ✅ [PASS] Join Event by Invite Code -> Joined Event: Clash of Titans
  ✅ [PASS] Event Leaderboard -> Participants: 2
  ✅ [PASS] Live Tournament Sync -> Synced participants

👥 5. SOCIAL GRAPH, FRIENDS & DISCOVERY
  ✅ [PASS] Search Users by Handle/Username -> Found: coderB_88878
  ✅ [PASS] Send Friend Request -> Status: pending_sent
  ✅ [PASS] List Friend Requests -> Incoming: 1, Outgoing: 0
  ✅ [PASS] Accept Friend Request -> Result: Friend request accepted!
  ✅ [PASS] List Accepted Friends -> Friends Count: 1
  ✅ [PASS] Friends Circle Standings -> User Rank: #1 of 2

⚔️ 6. HEAD-TO-HEAD 1v1 COMPARISON & AI COACH
  ✅ [PASS] 1v1 Head-to-Head Comparison Response -> Delta: 124 pts, Leader: user
  ✅ [PASS] Difficulty Breakdown (Easy/Med/Hard) -> Easy: 42 vs 1
  ✅ [PASS] DSA Topics & Category Mastery -> Topics Analyzed: 10
  ✅ [PASS] AI Strategic Battle Coach -> Plan Generated

🌐 7. MULTI-PLATFORM AGGREGATION & GLOBAL POWER INDEX (DPI)
  ✅ [PASS] Link Codeforces Account (tourist) -> Rating: 3530 Elo (legendary grandmaster), Solved: 2763
  ✅ [PASS] Link HackerRank Account (tourist) -> Level: 1, Badges: 0
  ✅ [PASS] Get Connected Platforms & DPI Profile -> DPI: 13,961 (Legendary Titan 👑)
  ✅ [PASS] Live Sync All Connected Platforms -> Synced DPI: 13,664
  ✅ [PASS] Global Developer Power Index Leaderboard -> Total Global Developers: Ranked
  ✅ [PASS] Cross-Platform 5-Way Matrix Comparison -> Platforms Matrix: 5 ecosystems, Wins: 1 vs 0
  ✅ [PASS] Unlink Platform Profile -> Unlinked HackerRank

🔔 8. NOTIFICATIONS & EVENT TRIGGERS
  ✅ [PASS] Register Mobile Push Token -> Push Token Registered
  ✅ [PASS] Fetch User Notifications Feed -> Notifications Feed Active

================================================================
🏁 TEST RESULTS: 29/29 TESTS PASSED (100% SUCCESS)
🎉 ALL CODEARENA FEATURES VERIFIED & FULLY FUNCTIONAL!
================================================================
```

* **Frontend Type Safety**: `npx tsc --noEmit` runs with **0 errors**.

---

## 🔮 Future Roadmap (Phase 4)

1. **Live 1v1 Code Editor**: Synchronized WebSocket room for live speed-coding duels with timed test suites.
2. **AI-Generated Custom Challenges**: Gemini-powered tailored coding problems based on identified DSA weaknesses.
3. **Discord & Slack Bots**: Automated daily leaderboard digests and tournament alerts pushed directly to developer communities.
4. **Knockout Bracket System**: Single- and double-elimination tournament trees for organizations and hackathons.
