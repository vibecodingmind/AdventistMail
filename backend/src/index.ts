import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { authRouter } from './auth/auth.routes.js';
import { mailRouter } from './mail/mail.routes.js';
import { usersRouter } from './users/users.routes.js';
import { sharedMailboxesRouter } from './shared-mailboxes/shared-mailboxes.routes.js';
import { adminRouter } from './admin/admin.routes.js';
import { emailRequestsRouter } from './email-requests/email-requests.routes.js';
import { initDatabase } from './db/init.js';

async function start() {
  try {
    await initDatabase();
  } catch (err) {
    console.warn('Database init failed (tables may already exist):', (err as Error).message);
  }

  const app = express();

app.use(cors({
  origin: config.app.url,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/mail', mailRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/mailboxes', sharedMailboxesRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/email-requests', emailRequestsRouter);

  app.listen(config.port, () => {
    console.log(`Adventist Church Mail API running on port ${config.port}`);
  });
}

start().catch(console.error);
