import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import { query } from '../db/index.js';

export const storageRouter = Router();

/* ── GET /storage/plans — list active plans (public) ── */
storageRouter.get('/plans', async (_req, res: Response) => {
  const result = await query<{ id: string; name: string; bytes_limit: number | null; price_label: string }>(
    'SELECT id, name, bytes_limit, price_label FROM storage_plans WHERE is_active = true ORDER BY bytes_limit ASC NULLS LAST'
  );
  res.json({ plans: result.rows });
});

/* ── GET /storage/usage — current user's plan and usage (auth) ── */
storageRouter.get('/usage', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const userResult = await query<{
    storage_plan_id: string | null;
    storage_used_bytes: string;
  }>(
    `SELECT storage_plan_id, COALESCE(storage_used_bytes, 0)::bigint::text as storage_used_bytes
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  const row = userResult.rows[0];
  if (!row) { res.status(404).json({ error: 'User not found' }); return; }

  const used = parseInt(row.storage_used_bytes || '0', 10);
  let planId = row.storage_plan_id;

  if (!planId) {
    const freePlan = await query<{ id: string; bytes_limit: number }>(
      "SELECT id, bytes_limit FROM storage_plans WHERE name = 'Free' AND is_active = true LIMIT 1"
    );
    planId = freePlan.rows[0]?.id || null;
  }

  const planResult = await query<{ name: string; bytes_limit: number | null }>(
    'SELECT name, bytes_limit FROM storage_plans WHERE id = $1',
    [planId]
  );
  const plan = planResult.rows[0];
  if (!plan) {
    const pendingCheck = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM storage_upgrade_requests WHERE user_id = $1 AND status = $2',
      [req.user!.id, 'pending']
    );
    res.json({
      planName: 'Free',
      planId: null,
      bytesUsed: used,
      bytesLimit: 500 * 1024 * 1024,
      percentage: Math.min(100, Math.round((used / (500 * 1024 * 1024)) * 100)),
      hasPendingUpgrade: parseInt(pendingCheck.rows[0]?.count || '0', 10) > 0,
    });
    return;
  }

  const limit = plan.bytes_limit ?? 500 * 1024 * 1024;
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const pendingCheck = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM storage_upgrade_requests WHERE user_id = $1 AND status = $2',
    [req.user!.id, 'pending']
  );

  res.json({
    planName: plan.name,
    planId,
    bytesUsed: used,
    bytesLimit: plan.bytes_limit,
    percentage,
    hasPendingUpgrade: parseInt(pendingCheck.rows[0]?.count || '0', 10) > 0,
  });
});

/* ── POST /storage/upgrade — submit upgrade request (auth) ── */
storageRouter.post(
  '/upgrade',
  authMiddleware,
  [body('requestedPlanId').isUUID().withMessage('Valid plan ID required')],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { requestedPlanId } = req.body;

    const existing = await query<{ id: string }>(
      'SELECT id FROM storage_upgrade_requests WHERE user_id = $1 AND status = $2',
      [req.user.id, 'pending']
    );
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'You already have a pending upgrade request' });
      return;
    }

    const planCheck = await query<{ id: string; name: string }>(
      'SELECT id, name FROM storage_plans WHERE id = $1 AND is_active = true',
      [requestedPlanId]
    );
    if (planCheck.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or inactive plan' });
      return;
    }

    const userRow = await query<{ storage_plan_id: string }>(
      'SELECT storage_plan_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const currentPlanId = userRow.rows[0]?.storage_plan_id || null;

    const insertResult = await query<{ id: string }>(
      `INSERT INTO storage_upgrade_requests (user_id, current_plan_id, requested_plan_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [req.user.id, currentPlanId, requestedPlanId]
    );

    res.status(201).json({
      id: insertResult.rows[0].id,
      message: 'Upgrade request submitted. A Super Admin will review it shortly.',
    });
  }
);
