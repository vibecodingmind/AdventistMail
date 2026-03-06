import { query } from '../db/index.js';

export interface AdminStats {
  usersCount: number;
  mailboxesCount: number;
  activeUsersCount: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const usersResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
  const activeResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM users WHERE is_active = true');
  const mailboxesResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM mailboxes');

  return {
    usersCount: parseInt(usersResult.rows[0]?.count || '0', 10),
    mailboxesCount: parseInt(mailboxesResult.rows[0]?.count || '0', 10),
    activeUsersCount: parseInt(activeResult.rows[0]?.count || '0', 10),
  };
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;
}

export async function getAuditLogs(
  limit: number = 100,
  offset: number = 0,
  action?: string,
  userId?: string
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  let whereClause = 'WHERE 1=1';
  const params: unknown[] = [];
  let i = 1;

  if (action) {
    whereClause += ` AND al.action = $${i++}`;
    params.push(action);
  }
  if (userId) {
    whereClause += ` AND al.user_id = $${i++}`;
    params.push(userId);
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs al ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || '0', 10);

  params.push(limit, offset);
  const result = await query<{
    id: string;
    user_id: string | null;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    metadata: unknown;
    ip_address: string | null;
    created_at: string;
    user_email: string | null;
  }>(
    `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.metadata, al.ip_address, al.created_at, u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );

  const logs: AuditLogEntry[] = result.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    metadata: row.metadata as Record<string, unknown> | null,
    ip_address: row.ip_address,
    created_at: row.created_at,
    user_email: row.user_email || undefined,
  }));

  return { logs, total };
}
