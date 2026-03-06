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
