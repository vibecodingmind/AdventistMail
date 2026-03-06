import { Router, Request, Response } from 'express';
import { param, query, body, validationResult } from 'express-validator';
import { authMiddleware, requireRole, type AuthRequest } from '../auth/auth.middleware.js';
import { getAdminStats, getAuditLogs } from './admin.service.js';
import {
  listPendingOrganizations,
  approveOrganization,
  rejectOrganization,
  listPendingOrgEmailRequests,
  approveOrgEmailRequest,
} from '../organizations/organizations.service.js';

export const adminRouter = Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireRole('admin', 'super_admin'));

adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

adminRouter.get(
  '/audit-logs',
  [
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('offset').optional().isInt({ min: 0 }),
    query('action').optional().isString(),
    query('userId').optional().isUUID(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const limit = parseInt((req.query.limit as string) || '100', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const action = req.query.action as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await getAuditLogs(limit, offset, action, userId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

/* ── Organization requests ── */
adminRouter.get('/organization-requests', async (_req: Request, res: Response) => {
  try {
    const requests = await listPendingOrganizations();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

adminRouter.patch(
  '/organization-requests/:id',
  [param('id').isUUID(), body('action').isIn(['approve', 'reject'])],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      if (req.body.action === 'approve') {
        const result = await approveOrganization(req.params.id);
        if (!result.success) {
          res.status(400).json({ error: result.error });
          return;
        }
      } else {
        await rejectOrganization(req.params.id);
      }
      res.json({ success: true, action: req.body.action });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

/* ── Organization email requests ── */
adminRouter.get('/organization-email-requests', async (_req: Request, res: Response) => {
  try {
    const requests = await listPendingOrgEmailRequests();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

adminRouter.patch(
  '/organization-email-requests/:id',
  [param('id').isUUID(), body('action').isIn(['approve', 'reject'])],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      if (req.body.action === 'approve') {
        const result = await approveOrgEmailRequest(req.params.id);
        if (!result.success) {
          res.status(400).json({ error: result.error });
          return;
        }
      } else {
        const { query } = await import('../db/index.js');
        await query(
          `UPDATE organization_email_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
          [req.params.id]
        );
      }
      res.json({ success: true, action: req.body.action });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

/* ── Allowed domains ── */
adminRouter.get('/domains', async (_req: Request, res: Response) => {
  const { query } = await import('../db/index.js');
  const r = await query('SELECT id, domain, is_active, created_at FROM allowed_domains ORDER BY domain');
  res.json({ domains: r.rows });
});

adminRouter.post('/domains', [body('domain').notEmpty().trim()], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const domain = req.body.domain.replace(/^@/, '').toLowerCase();
  if (!domain.includes('.')) return res.status(400).json({ error: 'Invalid domain' });
  const { query } = await import('../db/index.js');
  await query(
    'INSERT INTO allowed_domains (domain) VALUES ($1) ON CONFLICT (domain) DO UPDATE SET is_active = true',
    [domain]
  );
  res.json({ success: true });
});

adminRouter.delete('/domains/:id', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  const { query } = await import('../db/index.js');
  await query('DELETE FROM allowed_domains WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

/* ── Audit export ── */
adminRouter.get('/audit-export', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '10000', 10), 50000);
  const result = await getAuditLogs(limit, 0);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(result.logs);
});

/* ── Bulk user import ── */
adminRouter.post(
  '/users/bulk-import',
  [body('users').isArray(), body('users.*.email').isEmail(), body('users.*.password').isLength({ min: 8 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const bcrypt = await import('bcryptjs');
    const { query } = await import('../db/index.js');
    const { v4: uuidv4 } = await import('uuid');
    const users = req.body.users as Array<{ email: string; password: string; displayName?: string }>;
    const results: { email: string; success: boolean; error?: string }[] = [];
    for (const u of users) {
      try {
        const id = uuidv4();
        const hash = await bcrypt.default.hash(u.password, 12);
        const r = await query(
          `INSERT INTO users (id, email, display_name, role, password_hash, is_verified) VALUES ($1, $2, $3, 'user', $4, true)
           ON CONFLICT (email) DO NOTHING RETURNING id`,
          [id, u.email.toLowerCase(), u.displayName || null, hash]
        );
        results.push({ email: u.email, success: (r.rowCount ?? 0) > 0 });
      } catch (err) {
        results.push({ email: u.email, success: false, error: err instanceof Error ? err.message : 'Unknown' });
      }
    }
    res.json({ results });
  }
);
