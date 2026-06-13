# Mizpah Church Management - Deployment Guide

## Prerequisites
- GitHub account with your repo pushed
- Railway account (https://railway.app) OR Render account (https://render.com)
- A PostgreSQL database (Railway provides one, or use Neon for free tier)

## Deployment via Railway (Recommended)

### Step 1: Create Railway Project
1. Go to https://railway.app and log in
2. Click **New Project**
3. Select **Deploy from GitHub**
4. Authorize GitHub and select your `MIZPAH MANAGEMENT` repo
5. Select the branch (e.g., `main` or `render-deploy`)
6. Railway will auto-detect the `Dockerfile` and configure

### Step 2: Add PostgreSQL Plugin
1. In your Railway project dashboard, click **Add Plugin** (or +)
2. Select **PostgreSQL**
3. Wait for provisioning (~30 seconds)
4. Railway automatically creates `DATABASE_URL` environment variable

### Step 3: Set Environment Variables
In Railway project **Variables** tab, add:

```
DATABASE_URL          → Auto-filled by PostgreSQL plugin
JWT_SECRET            → Use a strong random string (e.g., from openssl rand -hex 32)
NODE_ENV              → production
CORS_ORIGIN           → (optional) your deployed domain
```

### Step 4: Deploy
1. Click **Deploy** button
2. Watch build logs:
   - `npm ci --workspaces` → installs dependencies
   - `npm run build` → builds client to `client/dist`
   - Server starts with client assets served

### Step 5: Verify
- Open the Railway-provided URL
- Test login with:
  - Username: `Elder`
  - Password: `Eldermizpah123`
- Check that API responses work (e.g., `/api` endpoint)

---

## Deployment via Render

### Step 1: Connect GitHub
1. Go to https://render.com and log in
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Select the branch

### Step 2: Configure Web Service
- **Name**: `mizpah-server`
- **Environment**: `Docker`
- **Build Command**: (leave empty—uses Dockerfile)
- **Start Command**: (leave empty—uses Dockerfile CMD)
- **Plan**: Paid (free tier no longer available for web services)

### Step 3: Add PostgreSQL Database
1. On Render dashboard, click **New +** → **PostgreSQL**
2. **Name**: `mizpah-db`
3. Note the auto-generated connection string
4. Copy `DATABASE_URL` from the database details

### Step 4: Link Database to Web Service
1. Go back to **mizpah-server** service
2. **Environment** tab → add variable:
   - `DATABASE_URL` → paste the connection string from PostgreSQL

### Step 5: Add Other Variables
```
JWT_SECRET    → strong random string
NODE_ENV      → production
CORS_ORIGIN   → (optional) your Render domain
```

### Step 6: Deploy
- Click **Deploy**
- Watch logs in **Events** tab

---

## Alternative: Free PostgreSQL on Neon

If using Render's free tier (no managed Postgres):

1. Go to https://neon.tech and sign up
2. Create a new project
3. Copy the **Connection String** (includes password)
4. In your deployment service, set `DATABASE_URL` to that string

---

## Local Testing Before Deploy

### Build & Test Production Locally

```bash
# Build client
npm run build

# Start server in production mode
$env:NODE_ENV='production'
npm --workspace server run start
```

Visit http://localhost:4000 — it should serve the built client and API.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module 'pg'` | Ensure `npm ci --workspaces` runs (Docker does this) |
| `DATABASE_URL not found` | Add the env var in deployment service settings |
| Port already in use | `Get-Process node \| Stop-Process -Force` (PowerShell) |
| Client not loading | Check that `client/dist` was built (see deploy logs) |
| Login fails | Verify `JWT_SECRET` is set (default is `'secret-key'` locally only) |
| CORS errors | Set `CORS_ORIGIN` to your deployed frontend domain |

---

## Commit & Push

```bash
git add .
git commit -m "Deployment configuration: Dockerfile, railway.json, Procfile, .env.example"
git push origin main
```

Deployment will start automatically if GitHub is connected to Railway/Render.

---

## After Deployment

1. Test the live app (login, create/update data)
2. Check that data persists in PostgreSQL
3. Monitor logs for errors
4. Set up any additional services (SMS provider, email, etc.) as needed
