# Adventist Church Mail System

A private internal email platform for churches with a Gmail-style interface. Built on Zimbra + Roundcube with Node.js backend and Next.js frontend.

## Features

- **Gmail-like UI**: Inbox, Sent, Drafts, Spam, Trash, Starred, Labels
- **Shared Mailboxes**: Department inboxes (it@church.org, media@church.org) with permissions
- **User Management**: Create users, assign roles, reset passwords, disable accounts
- **Admin Dashboard**: Stats, user management, mailbox management, audit logs
- **2FA**: TOTP two-factor authentication
- **Security**: HTTPS, JWT, LDAP (Zimbra), audit logging

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis
- Zimbra mail server (or use without for dev with Admin-created users)

## Quick Start

### 1. Install dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit backend/.env with your database, Redis, and Zimbra settings
# frontend/.env.local: NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 (for local dev)
```

### 3. Start services

```bash
# Terminal 1: Start PostgreSQL and Redis (or use Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### 4. Seed admin user (development)

```bash
cd backend && npx tsx scripts/seed.ts
```

Login at http://localhost:3000 with `admin@church.org` / `admin123`

## Docker Deployment

```bash
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Deploy to Railway (Live Link)

Deploy from GitHub to get a public URL. See **[RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)** for step-by-step instructions.

## Project Structure

```
adventist-church-mail/
├── backend/          # Node.js API
│   ├── src/
│   │   ├── auth/     # Login, JWT, 2FA
│   │   ├── mail/     # IMAP/SMTP, messages
│   │   ├── users/    # User CRUD
│   │   ├── admin/    # Dashboard, audit
│   │   └── shared-mailboxes/
├── frontend/         # Next.js
│   └── src/
│       ├── app/      # Pages (login, mail, admin)
│       └── components/
└── docker-compose.yml
```

## API Endpoints

- `POST /api/v1/auth/login` - Login
- `GET /api/v1/mail/messages` - List messages
- `GET /api/v1/mail/messages/:uid` - Get message
- `POST /api/v1/mail/send` - Send email
- `GET /api/v1/mailboxes` - List user's mailboxes
- `GET /api/v1/users` - List users (admin)
- `GET /api/v1/admin/stats` - Dashboard stats
- `GET /api/v1/admin/audit-logs` - Audit logs

## Zimbra Integration

Set these in `.env` for production:

- `ZIMBRA_LDAP_URL` - LDAP URL for auth
- `ZIMBRA_IMAP_HOST`, `ZIMBRA_IMAP_PORT` - IMAP
- `ZIMBRA_SMTP_HOST`, `ZIMBRA_SMTP_PORT` - SMTP

For user creation via Zimbra, set `USE_ZIMBRA_ADMIN=true` and ensure `zmprov` is available.
