import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import {
  createZimbraAccount,
  setZimbraPassword,
  disableZimbraAccount,
  enableZimbraAccount,
} from '../common/zimbra/admin.js';
import type { User, UserRole } from '../common/types.js';

const USE_ZIMBRA_ADMIN = process.env.USE_ZIMBRA_ADMIN === 'true';

export async function createUser(
  email: string,
  password: string,
  displayName?: string,
  role: UserRole = 'user'
): Promise<{ success: boolean; user?: User; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    return { success: false, error: 'User already exists' };
  }

  if (USE_ZIMBRA_ADMIN) {
    const result = await createZimbraAccount(normalizedEmail, password, displayName);
    if (!result.success) {
      return { success: false, error: result.error };
    }
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (id, email, display_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)`,
    [id, normalizedEmail, displayName || null, role, passwordHash]
  );

  const userResult = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    zimbra_id: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>('SELECT id, email, display_name, role, zimbra_id, is_active, created_at, updated_at FROM users WHERE id = $1', [
    id,
  ]);

  const row = userResult.rows[0];
  if (!row) return { success: false, error: 'Failed to create user' };

  return {
    success: true,
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      role: row.role as UserRole,
      zimbra_id: row.zimbra_id,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const userResult = await query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return { success: false, error: 'User not found' };

  if (USE_ZIMBRA_ADMIN) {
    const result = await setZimbraPassword(user.email, newPassword);
    if (!result.success) return { success: false, error: result.error };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    passwordHash,
    userId,
  ]);

  return { success: true };
}

export async function disableUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const userResult = await query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return { success: false, error: 'User not found' };

  if (USE_ZIMBRA_ADMIN) {
    const result = await disableZimbraAccount(user.email);
    if (!result.success) return { success: false, error: result.error };
  }

  await query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
  return { success: true };
}

export async function enableUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const userResult = await query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return { success: false, error: 'User not found' };

  if (USE_ZIMBRA_ADMIN) {
    const result = await enableZimbraAccount(user.email);
    if (!result.success) return { success: false, error: result.error };
  }

  await query('UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1', [userId]);
  return { success: true };
}

export async function assignUserRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  const validRoles: UserRole[] = ['super_admin', 'admin', 'user'];
  if (!validRoles.includes(role)) {
    return { success: false, error: 'Invalid role' };
  }

  const result = await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id', [
    role,
    userId,
  ]);
  if (result.rows.length === 0) return { success: false, error: 'User not found' };
  return { success: true };
}

export async function listUsers(): Promise<Omit<User, 'two_fa_secret'>[]> {
  const result = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    zimbra_id: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT id, email, display_name, role, zimbra_id, is_active, created_at, updated_at FROM users ORDER BY email'
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role as UserRole,
    zimbra_id: row.zimbra_id,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
