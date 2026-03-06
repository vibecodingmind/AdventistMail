# Railway Setup – Copy-Paste Values

## One-command setup (after Railway login)

```bash
# 1. Install Railway CLI (if needed)
npm i -g @railway/cli

# 2. Login and link (opens browser)
railway login
railway link   # Select your project & the adventistmail-production service

# 3. Run setup (sets variables automatically)
npm run railway:setup
```

Then add **DATABASE_URL** and **REDIS_URL** manually: Variables → Add Variable → Reference → Postgres/Redis.

---

**Which setup do I have?**
- **One service** = You deployed from repo root (no Root Directory set). Backend + frontend run together.
- **Two services** = You have separate Backend and Frontend services (Root Directory = `backend` and `frontend`).

---

## Your URL

**Production URL:** `https://adventistmail-production.up.railway.app`

---

## If you have ONE service (backend + frontend together)

Add these variables in your service **Variables** tab:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | *(Reference from Postgres service)* |
| `REDIS_URL` | *(Reference from Redis service)* |
| `JWT_SECRET` | *(Run `openssl rand -hex 32` in terminal, paste result)* |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://adventistmail-production.up.railway.app` |
| `API_URL` | `http://localhost:3001` |
| `NEXT_PUBLIC_API_URL` | `https://adventistmail-production.up.railway.app/api/v1` |

---

## If you have TWO services (backend + frontend separate)

### Backend service (Root Directory: `backend`)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | *(Reference from Postgres)* |
| `REDIS_URL` | *(Reference from Redis)* |
| `JWT_SECRET` | *(Run `openssl rand -hex 32`, paste result)* |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://YOUR-FRONTEND-URL.up.railway.app` *(set after frontend deploys)* |

### Frontend service (Root Directory: `frontend`)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://adventistmail-production.up.railway.app/api/v1` |

*(Use your backend URL if it’s different from adventistmail-production)*

---

## How to add variables in Railway

1. Open your service → **Variables** tab
2. Click **Add Variable** or **New Variable**
3. For `DATABASE_URL` and `REDIS_URL`: choose **Reference** and pick the value from the Postgres/Redis service
4. For others: paste the value from the table above

---

## Generate JWT_SECRET

In your terminal, run:

```bash
openssl rand -hex 32
```

Copy the output and paste it as `JWT_SECRET` in Railway.
