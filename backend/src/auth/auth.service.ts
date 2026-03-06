import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
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
): Promise<{ success: boolean; user?: AuthUser; reason?: string }> {
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

  // Fallback: users created by Admin or self-signup (stored password_hash in DB)
  const user = await getUserByEmail(email);
  if (user?.is_active) {
    if (!user.is_verified) {
      return { success: false, reason: 'pending_verification' };
    }
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

export async function signupUser(
  email: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    return { success: false, error: 'Email already registered' };
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (id, email, display_name, role, password_hash, is_verified) VALUES ($1, $2, $3, 'user', $4, false)`,
    [id, normalizedEmail, displayName || null, passwordHash]
  );

  return { success: true };
}

async function getUserByEmail(email: string): Promise<(User & { two_fa_secret?: string; is_verified?: boolean }) | null> {
  const result = await query<{
    id: string;
    email: string;
    display_name: string | null;
    role: string;
    zimbra_id: string | null;
    two_fa_secret: string | null;
    is_active: boolean;
    is_verified: boolean | null;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT id, email, display_name, role, zimbra_id, two_fa_secret, is_active, COALESCE(is_verified, true) as is_verified, created_at, updated_at FROM users WHERE email = $1',
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
    is_verified: row.is_verified ?? true,
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

export async function findOrCreateGoogleUser(
  credential: string,
  userInfo?: { sub?: string; email?: string; name?: string }
): Promise<{ success: boolean; user?: User & { is_verified?: boolean }; is_new?: boolean; error?: string }> {
  try {
    let email: string;
    let googleId: string;
    let displayName: string;

    if (userInfo?.email) {
      // Frontend passed userInfo from /userinfo endpoint (access_token flow)
      email = userInfo.email.toLowerCase();
      googleId = userInfo.sub || credential;
      displayName = userInfo.name || email.split('@')[0];
    } else {
      // id_token flow — verify with google-auth-library
      const clientId = config.google.clientId;
      if (!clientId) {
        return { success: false, error: 'Google Sign-In is not configured on this server.' };
      }
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return { success: false, error: 'Invalid Google credential' };
      }
      email = payload.email.toLowerCase();
      googleId = payload.sub;
      displayName = payload.name || email.split('@')[0];
    }

    // Find existing user by email or google_id
    const existing = await query<{
      id: string; email: string; display_name: string | null; role: string;
      zimbra_id: string | null; is_active: boolean; is_verified: boolean; google_id: string | null;
      created_at: Date; updated_at: Date;
    }>(
      'SELECT id, email, display_name, role, zimbra_id, is_active, COALESCE(is_verified, true) as is_verified, google_id, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (!row.is_active) return { success: false, error: 'Account is disabled' };

      // Link google_id if not linked yet
      if (!row.google_id) {
        await query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, row.id]);
      }

      if (!row.is_verified) {
        return { success: false, error: 'Account pending verification. An admin must verify your account before you can sign in.' };
      }

      return {
        success: true,
        is_new: false,
        user: {
          id: row.id, email: row.email, display_name: row.display_name,
          role: row.role as UserRole, zimbra_id: row.zimbra_id,
          is_active: row.is_active, is_verified: row.is_verified,
          created_at: row.created_at, updated_at: row.updated_at,
        },
      };
    }

    // New user — create with is_verified = false (requires admin approval)
    const id = uuidv4();
    await query(
      `INSERT INTO users (id, email, display_name, role, google_id, is_verified) VALUES ($1, $2, $3, 'user', $4, false)`,
      [id, email, displayName, googleId]
    );

    const newUser = await query<{
      id: string; email: string; display_name: string | null; role: string;
      zimbra_id: string | null; is_active: boolean; created_at: Date; updated_at: Date;
    }>('SELECT id, email, display_name, role, zimbra_id, is_active, created_at, updated_at FROM users WHERE id = $1', [id]);

    const u = newUser.rows[0];
    return {
      success: false,
      is_new: true,
      error: 'Account created. An admin must verify your account before you can sign in.',
    };
  } catch (err) {
    console.error('Google OAuth error:', err);
    return { success: false, error: 'Google authentication failed' };
  }
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
