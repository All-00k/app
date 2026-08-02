# 🚀 CodeArena: Production Deployment & Shipping Playbook

This playbook provides a step-by-step guide to hosting, building, and shipping **CodeArena** so thousands of concurrent users can compete in 1v1 Duels and Topic Sprints globally.

---

## 🏗️ 1. Infrastructure Overview

| Layer | Recommended Hosting Service | Free/Low-Cost Plan |
|---|---|---|
| **Backend API** | [Render](https://render.com) or [Railway](https://railway.app) | Free / $5 per mo |
| **Database** | Supabase PostgreSQL or Railway Postgres | Free Tier |
| **Web Frontend** | [Vercel](https://vercel.com) | Free Tier |
| **Mobile Apps (Android/iOS)** | Expo Application Services (EAS) | Free Tier |

---

## 🐘 2. Step 1: Migrate Database to PostgreSQL

SQLite works well locally, but for high concurrency across thousands of users, PostgreSQL is recommended.

1. **Create a Free Postgres Database**:
   - Sign up at [Supabase.com](https://supabase.com) or [Neon.tech](https://neon.tech).
   - Copy your database URI:
     ```env
     DATABASE_URL=postgres://user:password@ep-cool-db.us-east-1.aws.neon.tech/codearena
     ```

2. **Update Backend Database Connector** (`backend/src/database.js`):
   - Replace SQLite `sql.js` with `pg` / `knex` or keep `better-sqlite3` on a persistent volume if staying on Railway/Render.

---

## ⚡ 3. Step 2: Host the Node.js Backend API (Render / Railway)

### Option A: Deploy to Render (Recommended)

1. Push your repository to **GitHub**:
   ```bash
   git add .
   git commit -m "Prepare production deployment"
   git push origin main
   ```

2. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New + ➔ Web Service**.
3. Connect your GitHub repository.
4. Set the build parameters:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`

5. Add **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

6. Click **Create Web Service**. Render will build and provide your live API URL:
   `https://codearena-api.onrender.com`

---

## 🌐 4. Step 3: Ship the Web Application (Vercel)

1. Log in to [Vercel](https://vercel.com) and click **Add New ➔ Project**.
2. Connect your GitHub repository.
3. Update `src/services/api.ts` to point to your live Render backend URL:
   ```typescript
   const API_BASE = 'https://codearena-api.onrender.com/api';
   ```
4. Vercel automatically builds and deploys your web app to:
   `https://codearena.vercel.app`

---

## 📱 5. Step 4: Build & Publish Mobile Apps (Android APK & iOS)

To release CodeArena as a mobile application for Android (Google Play Store) and iOS (Apple App Store), use **Expo Application Services (EAS)**:

### 1. Install EAS CLI & Login
```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS Build
```bash
eas build:configure
```

### 3. Build Android APK for Testers & Users
```bash
eas build -p android --profile preview
```
> *EAS will compile your app in the cloud and generate an `.apk` download link ready to install on Android phones!*

### 4. Build Production Release for Google Play & Apple App Store
```bash
# Build Android App Bundle (.aab)
eas build -p android --profile production

# Build iOS App Bundle (.ipa)
eas build -p ios --profile production
```

---

## 🔔 6. Step 5: Enable Real Push Notifications

For push alerts when users solve problems:
1. Configure `expo-notifications` in `App.tsx`.
2. Generate Expo Push Credentials:
   ```bash
   eas credentials
   ```
3. Pass the generated token to `api.registerPushToken(token)` upon login.

---

## 🛡️ 7. Production Checklist

- [x] Configure HTTPS/SSL certificates (handled automatically by Render & Vercel)
- [x] Secure `JWT_SECRET` in server environment variables
- [x] Enable CORS headers for production domain (`https://codearena.vercel.app`)
- [x] Enable automatic SQLite/Postgres backup policy
