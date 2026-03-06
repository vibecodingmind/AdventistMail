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

## Email / SMTP (Required for sending)

To send emails, add these variables to the backend:

| Variable | Value | Example |
|----------|-------|---------|
| `SMTP_HOST` | Your mail server hostname | `smtp.gmail.com` or `mail.yourchurch.org` |
| `SMTP_PORT` | Usually `587` (TLS) or `465` (SSL) | `587` |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 | `false` |

**Without these**, sending fails with `ECONNREFUSED 127.0.0.1:587` because the app falls back to localhost.

**Gmail example:** Use an [App Password](https://support.google.com/accounts/answer/185833):
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `SMTP_SECURE` = `false`
- Sender must be a Gmail address; use that account's App Password when sending.

---

## Zimbra (Optional)

For production with Zimbra mail server, add these variables to the backend:

- `ZIMBRA_LDAP_URL`
- `ZIMBRA_IMAP_HOST`, `ZIMBRA_IMAP_PORT`
- `ZIMBRA_SMTP_HOST`, `ZIMBRA_SMTP_PORT`

Without Zimbra, users created by Admin in the dashboard can still log in (password stored in DB).

---

## Organizations

### Registration flow
- **Individual**: Sign up as usual → admin verifies → user can log in.
- **Organization**: On signup, choose "Organization" → enter org name, type (Church, Ministries, Institutions, Unions), requested email, and admin details → admin approves in Admin Dashboard → org owner can log in and manage the organization.

### Admin approval
1. Log in as Admin or Super Admin.
2. Go to **Admin** → **Org Requests** tab.
3. Approve or reject pending organization registrations.
4. Approve creates the org mailbox and grants the owner access.
5. For **Org Email Requests**: when org admins request additional official emails (e.g. info@church.org), approve those in the **Org Email Requests** tab.

### Org management
- Org owners: **Organizations** (in sidebar) → select org → Manage **Members** (invite, add), **Official Emails** (request new addresses), and **Domains** (add and verify your church domain).

### Domain verification (Phase 3)
1. Org admin goes to **Organization → Domains** tab.
2. Enters their church domain (e.g. `maranatha-church.org`).
3. System shows a DNS TXT record to add: `_adventistmail.maranatha-church.org` → `adventist-mail-verify=<token>`.
4. Admin adds the record in their DNS provider and clicks **Verify**.
5. Once verified, the org can request email addresses on that domain (e.g. `pastor@maranatha-church.org`).

---

## Health check

`GET /health` returns `{ status: 'ok', timestamp: '...' }`. Use this for Railway health checks or monitoring.

---

## New features (full implementation)

### Phase 1 — Core

| Feature | Location |
|---------|----------|
| **Email templates** | Settings → Templates; Compose → Insert template |
| **Filter rules** | Settings → Filters and Blocked Addresses |
| **Scheduled send** | Compose → Schedule datetime |
| **Undo send** | General settings → Undo Send (5–30 sec) |
| **Bulk actions** | Inbox: select messages → Read, Unread, Delete, Archive |
| **Attachment preview** | Add `?inline=1` to attachment URL for inline display |
| **Data export** | Settings → Security → Export your data (GDPR) |
| **Account deletion** | Settings → Security → Delete account |
| **Domain management** | Admin → Domains (add allowed domains) |
| **Audit export** | Admin → `GET /api/v1/admin/audit-export` |
| **Bulk user import** | `POST /api/v1/admin/users/bulk-import` with `{ users: [{ email, password, displayName? }] }` |
| **PWA** | Installable via `/manifest.json` |

### Phase 2 — Enhancements

| Feature | Location |
|---------|----------|
| **Snooze emails** | Inbox → Snooze button on messages |
| **Keyboard shortcuts** | j/k navigate, e archive, # delete, / search |
| **Quick reply** | Message view → Inline reply box |
| **Security alerts** | Login from new device triggers notification |
| **Org branding** | Organization → Branding (logo, primary color) |
| **Password policy** | Min 8 chars, expiry tracking |

### Phase 3 — Domain, Identity & Polish

| Feature | Location |
|---------|----------|
| **Domain verification** | Organization → Domains tab (add domain, verify via DNS TXT) |
| **Send mail as** | Settings → Accounts (shows personal + shared addresses) |
| **Delegate access** | Settings → Accounts → Grant access (add/remove delegates) |
| **Conversation threading** | Inbox (toggle in Settings → General → Conversation View) |
| **Custom folders** | Sidebar → Folders section (create, rename, delete) |
| **Vacation responder** | Settings → General → Vacation responder (saved to backend) |
| **Mail provisioning** | Auto-provisions on org/email approval (configurable mode) |

---

## Mail server provisioning (Phase 3)

Control how mailboxes are created when admin approves an org or email request:

| Variable | Value | Description |
|----------|-------|-------------|
| `MAIL_PROVISIONING_MODE` | `manual` (default), `zimbra`, or `api` | How mailboxes are provisioned |
| `PROVISIONING_WEBHOOK_URL` | URL | Required when mode is `api`; receives POST with `{ action, email }` |

- **manual**: Logs the action; admin creates the mailbox on the mail server manually.
- **zimbra**: Placeholder for Zimbra admin SOAP API integration.
- **api**: POSTs to your webhook URL to auto-create accounts on any mail server.

---

## Deployment verification

After deployment, verify:
1. **Health**: `curl https://your-backend.up.railway.app/health`
2. **Login**: Individual and org signup → admin approval → login.
3. **Org flow**: Register org → admin approve → org admin invites member → member accepts at `/invite?token=...`.
4. **Domain flow**: Org admin → Domains tab → add domain → verify DNS → request email on that domain.
5. **Threading**: Settings → General → Conversation View on → inbox shows grouped threads.
6. **Custom folders**: Sidebar → "+" next to Folders → create, rename, delete.
7. **Vacation**: Settings → General → Vacation responder → enable → save.
8. **Delegates**: Settings → Accounts → Grant access → add delegate email.
