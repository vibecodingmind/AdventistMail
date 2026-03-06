import { Router, Request, Response } from 'express';
import os from 'os';
import { authMiddleware, requireRole, type AuthRequest } from '../auth/auth.middleware.js';
import { query } from '../db/index.js';

export const superAdminRouter = Router();

superAdminRouter.use(authMiddleware);
superAdminRouter.use(requireRole('super_admin'));

/* ── Overview stats ── */
superAdminRouter.get('/stats', async (_req: Request, res: Response) => {
  const [users, active, pending, admins, auditToday, sessions] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
    query<{ count: string }>('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
    query<{ count: string }>('SELECT COUNT(*) as count FROM users WHERE is_verified = false'),
    query<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE role IN ('admin','super_admin')"),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`),
    query<{ count: string }>('SELECT COUNT(*) as count FROM refresh_tokens WHERE expires_at > NOW()'),
  ]);

  res.json({
    totalUsers: parseInt(users.rows[0]?.count || '0', 10),
    activeUsers: parseInt(active.rows[0]?.count || '0', 10),
    pendingVerification: parseInt(pending.rows[0]?.count || '0', 10),
    adminCount: parseInt(admins.rows[0]?.count || '0', 10),
    activityToday: parseInt(auditToday.rows[0]?.count || '0', 10),
    activeSessions: parseInt(sessions.rows[0]?.count || '0', 10),
  });
});

/* ── All users ── */
superAdminRouter.get('/users', async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const role = req.query.role as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 200);
  const offset = parseInt(req.query.offset as string || '0', 10);

  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  let i = 1;

  if (search) {
    where += ` AND (u.email ILIKE $${i} OR u.display_name ILIKE $${i})`;
    params.push(`%${search}%`);
    i++;
  }
  if (role) {
    where += ` AND u.role = $${i++}`;
    params.push(role);
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM users u ${where}`, params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  params.push(limit, offset);
  const result = await query<{
    id: string; email: string; display_name: string | null; role: string;
    is_active: boolean; is_verified: boolean | null; google_id: string | null;
    created_at: string; last_login: string | null;
  }>(
    `SELECT u.id, u.email, u.display_name, u.role, u.is_active,
       COALESCE(u.is_verified, true) as is_verified, u.google_id, u.created_at,
       (SELECT MAX(al.created_at) FROM audit_logs al WHERE al.user_id = u.id AND al.action = 'login') as last_login
     FROM users u ${where}
     ORDER BY u.created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );

  res.json({ users: result.rows, total });
});

/* ── Update user (role / status / verify) ── */
superAdminRouter.patch('/users/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role, is_active, is_verified } = req.body;

  if (id === req.user?.id) {
    res.status(400).json({ error: 'Cannot modify your own account here' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (role !== undefined) {
    if (!['user', 'admin', 'super_admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    updates.push(`role = $${i++}`);
    params.push(role);
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${i++}`);
    params.push(Boolean(is_active));
  }
  if (is_verified !== undefined) {
    updates.push(`is_verified = $${i++}`);
    params.push(Boolean(is_verified));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`,
    params
  );

  res.json({ success: true });
});

/* ── Delete user ── */
superAdminRouter.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user?.id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }
  await query('DELETE FROM users WHERE id = $1', [id]);
  res.json({ success: true });
});

/* ── Activity / Audit logs ── */
superAdminRouter.get('/activity', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string || '100', 10), 500);
  const offset = parseInt(req.query.offset as string || '0', 10);
  const action = req.query.action as string | undefined;
  const userId = req.query.userId as string | undefined;

  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  let i = 1;

  if (action) { where += ` AND al.action = $${i++}`; params.push(action); }
  if (userId) { where += ` AND al.user_id = $${i++}`; params.push(userId); }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs al ${where}`, params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  params.push(limit, offset);
  const result = await query<{
    id: string; user_id: string | null; action: string; resource_type: string | null;
    metadata: unknown; ip_address: string | null; created_at: string; user_email: string | null;
  }>(
    `SELECT al.id, al.user_id, al.action, al.resource_type, al.metadata, al.ip_address, al.created_at,
       u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );

  res.json({ logs: result.rows, total });
});

/* ── Active sessions ── */
superAdminRouter.get('/sessions', async (_req: Request, res: Response) => {
  const result = await query<{
    user_id: string; email: string; display_name: string | null;
    role: string; expires_at: string; created_at: string;
  }>(
    `SELECT rt.user_id, u.email, u.display_name, u.role, rt.expires_at, rt.created_at
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.expires_at > NOW()
     ORDER BY rt.created_at DESC`
  );
  res.json({ sessions: result.rows });
});

/* ── Revoke all sessions for a user ── */
superAdminRouter.delete('/sessions/:userId', async (req: Request, res: Response) => {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.params.userId]);
  res.json({ success: true });
});

/* ── Storage upgrade requests ── */
superAdminRouter.get('/storage-requests', async (_req: Request, res: Response) => {
  const result = await query<{
    id: string; user_id: string; user_email: string; user_display_name: string | null;
    current_plan_name: string | null; requested_plan_name: string;
    status: string; created_at: string;
  }>(
    `SELECT r.id, r.user_id, r.status, r.created_at,
       u.email as user_email, u.display_name as user_display_name,
       cp.name as current_plan_name, rp.name as requested_plan_name
     FROM storage_upgrade_requests r
     JOIN users u ON u.id = r.user_id
     JOIN storage_plans rp ON rp.id = r.requested_plan_id
     LEFT JOIN storage_plans cp ON cp.id = r.current_plan_id
     WHERE r.status = 'pending'
     ORDER BY r.created_at DESC`
  );
  res.json({ requests: result.rows });
});

superAdminRouter.patch(
  '/storage-requests/:id',
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Status must be approved or rejected' });
      return;
    }

    const reqRow = await query<{ user_id: string; requested_plan_id: string }>(
      'SELECT user_id, requested_plan_id FROM storage_upgrade_requests WHERE id = $1 AND status = $2',
      [id, 'pending']
    );
    if (reqRow.rows.length === 0) {
      res.status(404).json({ error: 'Request not found or already processed' });
      return;
    }

    const { user_id, requested_plan_id } = reqRow.rows[0];

    if (status === 'approved') {
      await query('UPDATE users SET storage_plan_id = $1, updated_at = NOW() WHERE id = $2', [
        requested_plan_id,
        user_id,
      ]);
    }

    await query(
      "UPDATE storage_upgrade_requests SET status = $1 WHERE id = $2",
      [status, id]
    );

    res.json({ success: true, status });
  }
);

/* ── System info ── */
superAdminRouter.get('/system', async (_req: Request, res: Response) => {
  const uptimeSeconds = process.uptime();
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  const dbResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM audit_logs');
  const auditCount = parseInt(dbResult.rows[0]?.count || '0', 10);

  const tableResult = await query<{ tablename: string; size: string }>(
    `SELECT relname as tablename,
       pg_size_pretty(pg_total_relation_size(relid)) as size
     FROM pg_catalog.pg_statio_user_tables
     ORDER BY pg_total_relation_size(relid) DESC`
  );

  res.json({
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: uptimeSeconds,
      uptimeFormatted: formatUptime(uptimeSeconds),
    },
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      systemTotal: totalMem,
      systemFree: freeMem,
      systemUsed: totalMem - freeMem,
    },
    os: {
      hostname: os.hostname(),
      cpus: os.cpus().length,
      loadAvg: os.loadavg(),
    },
    database: {
      auditLogEntries: auditCount,
      tables: tableResult.rows,
    },
  });
});

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}
