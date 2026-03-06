import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { query } from '../db/index.js';
import { authenticateWithLdap } from '../common/ldap.js';
import type { User, UserRole, JwtPayload } from '../common/types.js';

export interface LoginResult {
  user: Omit<User, 'two_fa_secret'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser extends Omit<User, 'two_fa_secret'> {
  twoFaEnabled?: boolean;
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser }> {
  // 1. Try LDAP (Zimbra) authentication
  const ldapResult = await authenticateWithLdap(email, password);

  if (ldapResult.success) {
    // 2. Get or create user in our DB
    let user = await getUserByEmail(email);
    if (!user) {
      // Auto-create user on first LDAP login (for existing Zimbra users)
      user = await createUserFromLdap(email, ldapResult.displayName);
    }

    if (!user.is_active) {
      return { success: false };
    }

    return {
      success: true,
      user: {
        ...user,
        twoFaEnabled: !!(user as { two_fa_secret?: string }).two_fa_secret,
      } as AuthUser,
    };
  }

  // Fallback: users created by Admin (stored password_hash in DB)
  const user = await getUserByEmail(email);
  if (user?.is_active) {
    const hashResult = await query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [user.id]
    );
    const passwordHash = hashResult.rows[0]?.password_hash;
    if (passwordHash && (await bcrypt.compare(password, passwordHash))) {
      return {
        success: true,
        user: {
          ...user,
          twoFaEnabled: !!(user as { two_fa_secret?: string }).two_fa_secret,
        } as AuthUser,
      };
    }
  }

  return { success: false };
}

async function getUserByEmail(email: string): Promise<(User & { two_fa_secret?: string }) | null> {
  const result = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    zimbra_id: string | null;
    two_fa_secret: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT id, email, display_name, role, zimbra_id, two_fa_secret, is_active, created_at, updated_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role as UserRole,
    zimbra_id: row.zimbra_id,
    two_fa_secret: row.two_fa_secret ?? undefined,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createUserFromLdap(
  email: string,
  displayName?: string
): Promise<User & { two_fa_secret?: string }> {
  const id = uuidv4();
  await query(
    `INSERT INTO users (id, email, display_name, role) VALUES ($1, $2, $3, 'user')`,
    [id, email.toLowerCase(), displayName || null]
  );
  const user = await getUserByEmail(email);
  return user!;
}

export function generateTokens(user: User): { accessToken: string; refreshToken: string; expiresIn: number } {
  const expiresIn = 900; // 15 minutes in seconds
  const accessPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
    expiresIn,
    algorithm: 'HS256',
  });

  const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
    expiresIn: String(config.jwt.refreshExpiresIn),
    algorithm: 'HS256',
  } as jwt.SignOptions);

  return { accessToken, refreshToken, expiresIn };
}

export async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

export async function verifyRefreshToken(refreshToken: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret) as JwtPayload;
    if (decoded.type !== 'refresh') return null;

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const result = await query<{ user_id: string }>(
      'SELECT user_id FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()',
      [decoded.sub, tokenHash]
    );

    if (result.rows.length === 0) return null;

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
      decoded.sub,
    ]);

    const row = userResult.rows[0];
    if (!row || !row.is_active) return null;

    return {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      role: row.role as UserRole,
      zimbra_id: row.zimbra_id,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    zimbra_id: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>('SELECT id, email, display_name, role, zimbra_id, is_active, created_at, updated_at FROM users WHERE id = $1', [
    userId,
  ]);

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role as UserRole,
    zimbra_id: row.zimbra_id,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
