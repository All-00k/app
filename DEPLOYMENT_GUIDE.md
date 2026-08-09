# 🚀 CodeArena: Production Deployment & Shipping Playbook

This playbook provides a step-by-step guide to hosting, building, and shipping **CodeArena** powered by **Supabase PostgreSQL** so thousands of concurrent users can compete in 1v1 Duels and Topic Sprints globally.

---

## 🏗️ 1. Infrastructure Overview

| Layer | Recommended Hosting Service | Free/Low-Cost Plan |
|---|---|---|
| **Database** | [Supabase](https://supabase.com) (Managed Postgres) | Free Tier |
| **Backend API** | [Render](https://render.com) or [Railway](https://railway.app) | Free / $5 per mo |
| **Web Frontend** | [Vercel](https://vercel.com) | Free Tier |
| **Mobile Apps (Android/iOS)** | Expo Application Services (EAS) | Free Tier |

---

## ⚡ 2. Step 1: Set Up Supabase Database

1. **Create a Free Project**:
   - Go to [Supabase](https://supabase.com) and create a new project.
   - Choose a database password and select your preferred region.

2. **Execute Database Schema**:
   - In your Supabase Dashboard, navigate to **SQL Editor** -> **New Query**.
   - Copy the contents of `supabase_schema.sql` (found in the root directory or `backend/supabase_schema.sql`).
   - Click **Run**. This will create all tables (`users`, `events`, `event_participants`, `daily_progress`, `notifications`), indexes, constraints, and Row Level Security (RLS) policies.

3. **Get API Credentials**:
   - Navigate to **Project Settings** -> **API**.
   - Copy:
     - **Project URL** (`SUPABASE_URL`)
     - **anon/public API key** (`SUPABASE_ANON_KEY`)
     - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)

4. **Add to `backend/.env`**:
   ```env
   PORT=3001
   NODE_ENV=production
   JWT_SECRET=your_super_secret_jwt_key_here
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

---

## ☁️ 3. Step 2: Host the Node.js Backend API (Render / Railway)

### Option A: Deploy to Render (Recommended)

1. Push your repository to **GitHub**:
   ```bash
   git add .
   git commit -m "Configure Supabase backend"
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
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
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

### 4. Build Production Release for Google Play & Apple App Store
```bash
# Build Android App Bundle (.aab)
eas build -p android --profile production

# Build iOS App Bundle (.ipa)
eas build -p ios --profile production
```

---

## 🛡️ 6. Production Checklist

- [x] Configure HTTPS/SSL certificates (handled automatically by Render & Vercel)
- [x] Secure `JWT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in server environment variables
- [x] Enable CORS headers for production domain
- [x] Run `supabase_schema.sql` on Supabase to ensure indexes and constraints are active
