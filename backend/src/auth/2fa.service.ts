import { authenticator } from 'otplib';
import { query } from '../db/index.js';

authenticator.options = { digits: 6, step: 30 };

export async function generate2FASecret(userId: string, email: string): Promise<{ secret: string; qrUrl: string }> {
  const secret = authenticator.generateSecret();
  const qrUrl = authenticator.keyuri(email, 'Adventist Church Mail', secret);
  return { secret, qrUrl };
}

export async function enable2FA(userId: string, secret: string, token: string): Promise<{ success: boolean; error?: string }> {
  const isValid = authenticator.verify({ token, secret });
  if (!isValid) return { success: false, error: 'Invalid verification code' };

  await query('UPDATE users SET two_fa_secret = $1, updated_at = NOW() WHERE id = $2', [secret, userId]);
  return { success: true };
}

export async function verify2FALogin(userId: string, token: string): Promise<boolean> {
  const result = await query<{ two_fa_secret: string }>('SELECT two_fa_secret FROM users WHERE id = $1', [userId]);
  const secret = result.rows[0]?.two_fa_secret;
  if (!secret) return false;
  return authenticator.verify({ token, secret });
}

export async function disable2FA(userId: string): Promise<void> {
  await query('UPDATE users SET two_fa_secret = NULL, updated_at = NOW() WHERE id = $1', [userId]);
}
