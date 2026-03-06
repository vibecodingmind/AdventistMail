import { query } from '../db/index.js';
import { ensureMailboxExists, grantMailboxAccess } from '../shared-mailboxes/shared-mailboxes.service.js';

export interface EmailRequest {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  requested_email: string;
  church_name: string | null;
  purpose: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function getMyRequests(userId: string): Promise<EmailRequest[]> {
  const result = await query<EmailRequest>(
    `SELECT id, user_id, requested_email, church_name, purpose, status, admin_note, created_at, updated_at
     FROM email_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createEmailRequest(
  userId: string,
  requestedEmail: string,
  churchName?: string,
  purpose?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  // Check for duplicate pending/approved request for the same email
  const existing = await query(
    `SELECT id FROM email_requests WHERE user_id = $1 AND requested_email = $2 AND status IN ('pending', 'approved')`,
    [userId, requestedEmail.toLowerCase().trim()]
  );
  if (existing.rows.length > 0) {
    return { success: false, error: 'A request for this email already exists.' };
  }

  const result = await query<{ id: string }>(
    `INSERT INTO email_requests (user_id, requested_email, church_name, purpose, status)
     VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
    [userId, requestedEmail.toLowerCase().trim(), churchName || null, purpose || null]
  );

  return { success: true, id: result.rows[0].id };
}

export async function listAllRequests(status?: string): Promise<EmailRequest[]> {
  const values: string[] = [];
  let whereClause = '';
  if (status) {
    whereClause = ' WHERE er.status = $1';
    values.push(status);
  }

  const result = await query<EmailRequest & { user_email: string; user_name: string | null }>(
    `SELECT er.id, er.user_id, u.email as user_email, u.display_name as user_name,
            er.requested_email, er.church_name, er.purpose, er.status, er.admin_note,
            er.created_at, er.updated_at
     FROM email_requests er
     JOIN users u ON u.id = er.user_id${whereClause}
     ORDER BY er.created_at DESC`,
    values
  );
  return result.rows;
}

export async function approveEmailRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  const reqResult = await query<{ id: string; user_id: string; requested_email: string; status: string }>(
    'SELECT id, user_id, requested_email, status FROM email_requests WHERE id = $1',
    [requestId]
  );

  if (reqResult.rows.length === 0) return { success: false, error: 'Request not found' };
  const req = reqResult.rows[0];
  if (req.status !== 'pending') return { success: false, error: 'Request is not pending' };

  // Create shared mailbox + grant can_send_as access
  const mailboxId = await ensureMailboxExists(req.requested_email, 'shared');
  await grantMailboxAccess(mailboxId, req.user_id, {
    can_read: true,
    can_send_as: true,
    can_reply_as: true,
    can_manage_folders: false,
  });

  // Update request status
  await query(
    `UPDATE email_requests SET status = 'approved', admin_note = $1, updated_at = NOW() WHERE id = $2`,
    [adminNote || null, requestId]
  );

  return { success: true };
}

export async function rejectEmailRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await query(
    `UPDATE email_requests SET status = 'rejected', admin_note = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'pending'`,
    [adminNote || null, requestId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return { success: false, error: 'Request not found or not pending' };
  }
  return { success: true };
}
