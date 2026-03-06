# Deploy Adventist Church Mail to Railway

Deploy your app from GitHub to Railway in a few steps.

> **Quick setup:** See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for copy-paste variable values for `adventistmail-production.up.railway.app`.

## Prerequisites

- [Railway](https://railway.app) account
- GitHub repo with your code pushed

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your repository and connect it

---

## Step 2: Add PostgreSQL and Redis

1. In your Railway project, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway creates a Postgres service and sets `DATABASE_URL` automatically
4. Click **+ New** again → **Database** → **Redis**
5. Railway creates Redis and sets `REDIS_URL` automatically

---

## Step 3: Deploy Backend

1. Click **+ New** → **GitHub Repo**
2. Select the same repository
3. Railway creates a new service
4. **Settings** → set **Root Directory** to `backend`
5. **Variables** → add or verify:
   - `PORT` = `3001` (Railway sets this automatically; your app uses it)
   - `JWT_SECRET` = (generate a random string, e.g. `openssl rand -hex 32`)
   - `DATABASE_URL` = (reference from Postgres: click **Add Variable** → **Reference** → select Postgres `DATABASE_URL`)
   - `REDIS_URL` = (reference from Redis: **Add Variable** → **Reference** → select Redis `REDIS_URL`)
   - `APP_URL` = (set after frontend is deployed; use your frontend URL)
   - `NODE_ENV` = `production`

6. **Settings** → **Networking** → enable **Generate Domain** so the backend gets a public URL
7. Deploy; note the backend URL (e.g. `https://your-backend.up.railway.app`)

---

## Step 4: Deploy Frontend

1. Click **+ New** → **GitHub Repo**
2. Select the same repository
3. **Settings** → set **Root Directory** to `frontend`
4. **Variables** → add:
   - `NEXT_PUBLIC_API_URL` = `https://YOUR-BACKEND-URL/api/v1`  
     (use the backend domain from Step 3, e.g. `https://adventist-mail-backend.up.railway.app/api/v1`)

5. **Settings** → **Networking** → enable **Generate Domain**
6. Deploy

---

## Step 5: Update CORS (Backend)

1. Open the **Backend** service
2. **Variables** → set `APP_URL` to your frontend URL (e.g. `https://your-frontend.up.railway.app`)
3. Redeploy the backend so CORS allows the frontend origin

---

## Step 6: Access Your App

1. Open the frontend URL from Railway
2. Log in with:
   - **Email:** `admin@church.org`
   - **Password:** `admin123`
3. Change the password after first login

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login fails / 401 | Check `JWT_SECRET` is set; ensure `DATABASE_URL` and `REDIS_URL` are referenced correctly |
| CORS error | Set `APP_URL` on backend to your frontend URL |
| Frontend can't reach API | Ensure `NEXT_PUBLIC_API_URL` includes `/api/v1` and matches the backend URL |
| Database connection failed | Verify Postgres is running; check `DATABASE_URL` format |

---

## Zimbra (Optional)

For production with Zimbra mail server, add these variables to the backend:

- `ZIMBRA_LDAP_URL`
- `ZIMBRA_IMAP_HOST`, `ZIMBRA_IMAP_PORT`
- `ZIMBRA_SMTP_HOST`, `ZIMBRA_SMTP_PORT`

Without Zimbra, users created by Admin in the dashboard can still log in (password stored in DB).
