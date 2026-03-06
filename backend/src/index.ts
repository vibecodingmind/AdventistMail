import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { authRouter } from './auth/auth.routes.js';
import { mailRouter } from './mail/mail.routes.js';
import { usersRouter } from './users/users.routes.js';
import { sharedMailboxesRouter } from './shared-mailboxes/shared-mailboxes.routes.js';
import { adminRouter } from './admin/admin.routes.js';
import { emailRequestsRouter } from './email-requests/email-requests.routes.js';
import { storageRouter } from './storage/storage.routes.js';
import { superAdminRouter } from './superadmin/superadmin.routes.js';
import { organizationsRouter } from './organizations/organizations.routes.js';
import { signaturesRouter } from './signatures/signatures.routes.js';
import { templatesRouter } from './templates/templates.routes.js';
import { filtersRouter } from './filters/filters.routes.js';
import { scheduledRouter } from './scheduled/scheduled.routes.js';
import { snoozeRouter } from './snooze/snooze.routes.js';
import { processDueScheduled } from './scheduled/scheduled.service.js';
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

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Send rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);
app.use('/api/v1/auth/signup/organization', authLimiter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/mail/send', sendLimiter);
app.use('/api/v1/mail', mailRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/mailboxes', sharedMailboxesRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/email-requests', emailRequestsRouter);
app.use('/api/v1/storage', storageRouter);
app.use('/api/v1/superadmin', superAdminRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/signatures', signaturesRouter);
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/filters', filtersRouter);
app.use('/api/v1/scheduled', scheduledRouter);
app.use('/api/v1/snooze', snoozeRouter);

  // Process scheduled emails every minute
  setInterval(() => {
    processDueScheduled().catch((err) => console.warn('Scheduled send error:', (err as Error).message));
  }, 60 * 1000);

  app.listen(config.port, () => {
    console.log(`Adventist Church Mail API running on port ${config.port}`);
  });
}

start().catch(console.error);
