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

export interface UserSession {
  id: string;
  created_at: Date;
  expires_at: Date;
}

export async function getSessionsForUser(userId: string): Promise<UserSession[]> {
  const result = await query<{ id: string; created_at: Date; expires_at: Date }>(
    `SELECT id, created_at, expires_at FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM refresh_tokens WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  return (result.rowCount ?? 0) > 0;
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

async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const smtpHost = config.zimbra.smtp.host;
  const smtpUser = config.smtp.user;
  const smtpPass = config.smtp.pass;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0E1829;color:#e2e8f0;border-radius:12px;">
      <h2 style="color:#34d399;margin-top:0;">Reset your password</h2>
      <p style="color:#94a3b8;">You requested a password reset for your Adventist Church Mail account.</p>
      <p style="color:#94a3b8;">Click the button below to set a new password. This link expires in <strong style="color:#e2e8f0;">1 hour</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#1E2D45;color:#34d399;text-decoration:none;border-radius:8px;font-weight:600;border:1px solid rgba(52,211,153,0.3);">
        Reset Password
      </a>
      <p style="color:#475569;font-size:12px;">If you didn't request this, ignore this email — your password won't change.</p>
      <p style="color:#475569;font-size:12px;">Or copy this link: <a href="${resetUrl}" style="color:#64748b;">${resetUrl}</a></p>
    </div>
  `;

  if (!smtpHost || smtpHost === 'localhost' || smtpHost === '127.0.0.1' || !smtpUser) {
    console.log(`[Password Reset] Reset link for ${to}: ${resetUrl}`);
    return;
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: config.zimbra.smtp.port,
      secure: config.zimbra.smtp.secure,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `"Adventist Church Mail" <${smtpUser}>`,
      to,
      subject: 'Reset your Adventist Church Mail password',
      html,
    });
  } catch (err) {
    console.error('Failed to send password reset email:', err);
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getUserByEmail(email);

  if (!user) {
    return { success: true };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
  await query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${config.app.url}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return { success: true };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await query<{ user_id: string; expires_at: Date; used_at: Date | null }>(
    'SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1',
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row) return { success: false, error: 'Invalid or expired reset link.' };
  if (row.used_at) return { success: false, error: 'This reset link has already been used.' };
  if (new Date() > row.expires_at) return { success: false, error: 'Reset link has expired. Please request a new one.' };

  const newHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, row.user_id]);
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [tokenHash]);

  return { success: true };
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
