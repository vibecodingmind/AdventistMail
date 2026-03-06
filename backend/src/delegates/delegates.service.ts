import { query } from '../db/index.js';

export interface Delegate {
  id: string;
  delegate_user_id: string;
  email: string;
  display_name: string;
  can_read: boolean;
  can_send_as: boolean;
  created_at: string;
}

export interface GrantedAccess {
  id: string;
  owner_id: string;
  owner_email: string;
  owner_display_name: string;
  can_read: boolean;
  can_send_as: boolean;
  created_at: string;
}

export async function getDelegates(userId: string): Promise<Delegate[]> {
  const result = await query<{
    id: string;
    delegate_id: string;
    email: string;
    display_name: string;
    can_read: boolean;
    can_send_as: boolean;
    created_at: string;
  }>(
    `SELECT d.id, d.delegate_id, u.email, u.display_name, d.can_read, d.can_send_as, d.created_at
     FROM delegates d
     JOIN users u ON u.id = d.delegate_id
     WHERE d.owner_id = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    delegate_user_id: r.delegate_id,
    email: r.email,
    display_name: r.display_name,
    can_read: r.can_read,
    can_send_as: r.can_send_as,
    created_at: r.created_at,
  }));
}

export async function addDelegate(
  userId: string,
  delegateEmail: string,
  permissions: { can_read?: boolean; can_send_as?: boolean }
): Promise<Delegate> {
  const userResult = await query<{ id: string; email: string; display_name: string }>(
    `SELECT id, email, display_name FROM users WHERE email = $1`,
    [delegateEmail]
  );
  if (userResult.rows.length === 0) {
    throw new Error('User not found with that email address');
  }

  const delegate = userResult.rows[0];

  if (delegate.id === userId) {
    throw new Error('You cannot add yourself as a delegate');
  }

  const existing = await query(
    `SELECT id FROM delegates WHERE owner_id = $1 AND delegate_id = $2`,
    [userId, delegate.id]
  );
  if (existing.rows.length > 0) {
    throw new Error('This user is already a delegate');
  }

  const canRead = permissions.can_read !== undefined ? permissions.can_read : true;
  const canSendAs = permissions.can_send_as !== undefined ? permissions.can_send_as : false;

  const result = await query<{ id: string; created_at: string }>(
    `INSERT INTO delegates (owner_id, delegate_id, can_read, can_send_as)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [userId, delegate.id, canRead, canSendAs]
  );

  return {
    id: result.rows[0].id,
    delegate_user_id: delegate.id,
    email: delegate.email,
    display_name: delegate.display_name,
    can_read: canRead,
    can_send_as: canSendAs,
    created_at: result.rows[0].created_at,
  };
}

export async function removeDelegate(userId: string, delegateId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM delegates WHERE id = $1 AND owner_id = $2`,
    [delegateId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getDelegatedAccess(userId: string): Promise<GrantedAccess[]> {
  const result = await query<{
    id: string;
    owner_id: string;
    email: string;
    display_name: string;
    can_read: boolean;
    can_send_as: boolean;
    created_at: string;
  }>(
    `SELECT d.id, d.owner_id, u.email, u.display_name, d.can_read, d.can_send_as, d.created_at
     FROM delegates d
     JOIN users u ON u.id = d.owner_id
     WHERE d.delegate_id = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    owner_id: r.owner_id,
    owner_email: r.email,
    owner_display_name: r.display_name,
    can_read: r.can_read,
    can_send_as: r.can_send_as,
    created_at: r.created_at,
  }));
}
