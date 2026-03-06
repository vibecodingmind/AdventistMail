import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { authMiddleware, requireRole, type AuthRequest } from '../auth/auth.middleware.js';
import { getAdminStats, getAuditLogs } from './admin.service.js';

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
