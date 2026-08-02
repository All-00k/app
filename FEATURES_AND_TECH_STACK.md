# 🚀 CodeArena: Features & Technology Stack Architecture

**CodeArena** is a high-performance, real-time competitive tournament and gaming platform for LeetCode developers. It empowers coders to engage in 1v1 Algo Duels, join multi-day Topic Sprints, track live leaderboards, earn Tier progression badges, and receive instant push notification alerts when opponents solve problems.

---

## ⚡ 1. Complete Feature Set

### ⚔️ 1. Competitive Tournament Modes
- **⚔️ 1v1 Head-to-Head Duel Mode**:
  - Fast-paced 1v1 battle mode capped strictly at **2 participants**.
  - Automatic cap enforcement prevents extra players from joining once full.
- **🎯 Topic Sprint Mode**:
  - Multi-day competitive sprints focused on specific Data Structures & Algorithms topics (e.g. *Graphs & Trees*, *Dynamic Programming*, *Arrays*, *Hash Tables*).
- **🏆 Standard Tournaments**:
  - Custom duration multi-player open tournaments with unique invite code joining (`SUMMER26`).

### 🏆 2. Leaderboards & Gamified Tier System
- **Real-Time Leaderboard Scoring**:
  - Weighted point system based on problem difficulty deltas solved during events:
    - 🟢 **Easy Problem**: +10 Score / XP
    - 🟡 **Medium Problem**: +20 Score / XP
    - 🔴 **Hard Problem**: +40 Score / XP
- **Dynamic Coder Tier Progression**:
  - 🥉 **Novice Coder** (0 – 499 XP)
  - 🥈 **Code Warrior** (500 – 1,499 XP)
  - 🥇 **Algo Master** (1,500 – 2,999 XP)
  - 👑 **Grandmaster** (3,000+ XP)
- **Global Coders Leaderboard**:
  - Live global ranking table showcasing top coders by tier, total solved counts, and total accumulated XP.

### 🔔 3. Real-Time Push Notifications & Activity Feed
- **Live Solve Alert Triggers**:
  - Automatically triggers a notification when a competitor solves a LeetCode problem during an active event.
- **Notification Feed Panel**:
  - Interactive activity stream displaying solve events, event joins, and score updates.
- **Mobile Push Token Integration**:
  - Expo Push Notification token registration (`POST /api/notifications/push-token`).

### 🔄 4. LeetCode GraphQL Live Synchronization
- **Direct LeetCode Integration**:
  - Queries official LeetCode GraphQL endpoint (`https://leetcode.com/graphql/`) for accurate problem solve counts (`matchedUser.submitStats`).
- **User & Event Sync Controllers**:
  - One-click manual and background automatic problem sync for participants.

### 🔐 5. Security & Authentication
- **JWT (JSON Web Token) Session Management**:
  - Bearer token authentication header for protected endpoints.
- **Password Security**:
  - Password hashing via `bcryptjs` with salt rounds.

### 🎨 6. Futuristic UI / UX Design
- Modern dark mode visual aesthetics.
- Custom reusable React Native components (`TierCard`, `EventCard`, `BadgePill`).
- Responsive layout supporting Web, Android, and iOS devices.

---

## 🛠️ 2. Technology Stack & Dependencies

### 🌐 Frontend (Mobile & Web App)
| Technology | Description |
|---|---|
| **React Native** | Cross-platform UI framework for iOS, Android, and Web |
| **Expo SDK** | React Native platform tools and cloud build ecosystem |
| **TypeScript** | Strongly typed code for state and API models |
| **React Navigation** | Stack navigation and routing |
| **Axios** | HTTP client for backend REST API communication |
| **Vanilla CSS-in-JS** | Performance-optimized React Native `StyleSheet` styling |

### ⚡ Backend API
| Technology | Description |
|---|---|
| **Node.js** | JavaScript runtime environment |
| **Express.js** | Fast, minimalist web framework for REST API routing |
| **Modular MVC Architecture** | Clean separation of Controllers, Routes, Middleware, Services, and Database layer |
| **cors** | Cross-Origin Resource Sharing middleware |
| **bcryptjs** | Password encryption |
| **jsonwebtoken (JWT)** | User session verification |

### 🗄️ Database & Data Storage
| Technology | Description |
|---|---|
| **SQLite (`sql.js`)** | In-memory and file-backed relational SQLite database |
| **Database Migrations** | Dynamic `ALTER TABLE` and table schema initialization script |

### ☁️ Infrastructure, DevOps & Cloud Hosting
| Component | Provider / Platform |
|---|---|
| **Backend API Hosting** | **[Render.com](https://render.com)** Web Service (`https://app-blw0.onrender.com`) |
| **Web App Hosting** | **[Vercel](https://vercel.com)** Static & SSR Hosting |
| **Mobile App Builds** | **Expo Application Services (EAS Build)** Cloud Build Engine |
| **Version Control** | **GitHub** (`https://github.com/All-00k/app.git`) |

---

## 📊 3. System Architecture Diagram

```
  [ Mobile App (Android/iOS) ]     [ Web App (Vercel) ]
               \                         /
                \                       /
                 ▼                     ▼
           ┌────────────────────────────────┐
           │   CodeArena Backend REST API   │
           │   (Node.js + Express on Render)│
           └───────────────┬────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    ┌─────────────────┐       ┌──────────────────────┐
    │ SQLite Database │       │  LeetCode GraphQL    │
    │  (codearena.db) │       │ https://leetcode.com │
    └─────────────────┘       └──────────────────────┘
```
