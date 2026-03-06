import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';

export interface MailboxWithAccess {
  id: string;
  email: string;
  type: string;
  display_name: string | null;
  can_read: boolean;
  can_send_as: boolean;
  can_reply_as: boolean;
  can_manage_folders: boolean;
}

export async function getMailboxesForUser(userId: string): Promise<MailboxWithAccess[]> {
  const userResult = await query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return [];

  const mailboxes: MailboxWithAccess[] = [];

  // 1. Personal mailbox (always first) - ensure it exists
  let personalId = await query<{ id: string }>('SELECT id FROM mailboxes WHERE email = $1', [user.email]).then(
    (r) => r.rows[0]?.id
  );
  if (!personalId) {
    personalId = await ensureMailboxExists(user.email, 'personal');
  }
  const personalMailbox = await query<{ display_name: string | null }>(
    'SELECT display_name FROM mailboxes WHERE id = $1',
    [personalId]
  );
  mailboxes.push({
    id: personalId,
    email: user.email,
    type: 'personal',
    display_name: personalMailbox.rows[0]?.display_name || null,
    can_read: true,
    can_send_as: true,
    can_reply_as: true,
    can_manage_folders: true,
  });

  // 2. Shared mailboxes from mailbox_access
  const sharedResult = await query<{
    id: string;
    email: string;
    type: string;
    display_name: string | null;
    can_read: boolean;
    can_send_as: boolean;
    can_reply_as: boolean;
    can_manage_folders: boolean;
  }>(
    `SELECT m.id, m.email, m.type, m.display_name, ma.can_read, ma.can_send_as, ma.can_reply_as, ma.can_manage_folders
     FROM mailbox_access ma
     JOIN mailboxes m ON m.id = ma.mailbox_id
     WHERE ma.user_id = $1`,
    [userId]
  );

  for (const row of sharedResult.rows) {
    mailboxes.push({
      id: row.id,
      email: row.email,
      type: row.type,
      display_name: row.display_name,
      can_read: row.can_read,
      can_send_as: row.can_send_as,
      can_reply_as: row.can_reply_as,
      can_manage_folders: row.can_manage_folders,
    });
  }

  return mailboxes;
}

export async function ensureMailboxExists(email: string, type: 'personal' | 'shared' = 'shared'): Promise<string> {
  const existing = await query<{ id: string }>('SELECT id FROM mailboxes WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const id = uuidv4();
  await query(
    'INSERT INTO mailboxes (id, email, type) VALUES ($1, $2, $3)',
    [id, email.toLowerCase(), type]
  );
  return id;
}

export async function grantMailboxAccess(
  mailboxId: string,
  userId: string,
  permissions: {
    can_read?: boolean;
    can_send_as?: boolean;
    can_reply_as?: boolean;
    can_manage_folders?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const id = uuidv4();
  const canRead = permissions.can_read ?? true;
  const canSendAs = permissions.can_send_as ?? false;
  const canReplyAs = permissions.can_reply_as ?? false;
  const canManageFolders = permissions.can_manage_folders ?? false;

  await query(
    `INSERT INTO mailbox_access (id, user_id, mailbox_id, can_read, can_send_as, can_reply_as, can_manage_folders)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, mailbox_id) DO UPDATE SET
       can_read = EXCLUDED.can_read,
       can_send_as = EXCLUDED.can_send_as,
       can_reply_as = EXCLUDED.can_reply_as,
       can_manage_folders = EXCLUDED.can_manage_folders`,
    [id, userId, mailboxId, canRead, canSendAs, canReplyAs, canManageFolders]
  );
  return { success: true };
}

export async function updateMailboxAccess(
  mailboxId: string,
  userId: string,
  permissions: {
    can_read?: boolean;
    can_send_as?: boolean;
    can_reply_as?: boolean;
    can_manage_folders?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (permissions.can_read !== undefined) {
    updates.push(`can_read = $${i++}`);
    values.push(permissions.can_read);
  }
  if (permissions.can_send_as !== undefined) {
    updates.push(`can_send_as = $${i++}`);
    values.push(permissions.can_send_as);
  }
  if (permissions.can_reply_as !== undefined) {
    updates.push(`can_reply_as = $${i++}`);
    values.push(permissions.can_reply_as);
  }
  if (permissions.can_manage_folders !== undefined) {
    updates.push(`can_manage_folders = $${i++}`);
    values.push(permissions.can_manage_folders);
  }

  if (updates.length === 0) return { success: true };

  values.push(mailboxId, userId);
  const result = await query(
    `UPDATE mailbox_access SET ${updates.join(', ')} WHERE mailbox_id = $${i} AND user_id = $${i + 1}`,
    values
  );
  return { success: (result.rowCount ?? 0) > 0 };
}

export async function revokeMailboxAccess(mailboxId: string, userId: string): Promise<{ success: boolean }> {
  await query('DELETE FROM mailbox_access WHERE mailbox_id = $1 AND user_id = $2', [mailboxId, userId]);
  return { success: true };
}

export async function listSharedMailboxes(adminUserId: string): Promise<{ id: string; email: string; type: string; display_name: string | null }[]> {
  const result = await query<{ id: string; email: string; type: string; display_name: string | null }>(
    'SELECT id, email, type, display_name FROM mailboxes WHERE type = $1 ORDER BY email',
    ['shared']
  );
  return result.rows;
}
