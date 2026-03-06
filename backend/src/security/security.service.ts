import crypto from 'crypto';
import { query as dbQuery } from '../db/index.js';

export async function recordLoginSecurity(
  userId: string,
  ipAddress: string | undefined,
  userAgent: string | undefined
): Promise<{ isNewDevice: boolean }> {
  const deviceHash = crypto
    .createHash('sha256')
    .update(`${userAgent || 'unknown'}|${ipAddress || 'unknown'}`)
    .digest('hex');

  const existing = await dbQuery(
    'SELECT id FROM known_devices WHERE user_id = $1 AND device_hash = $2',
    [userId, deviceHash]
  );

  if (existing.rows.length > 0) {
    await dbQuery(
      'UPDATE known_devices SET last_seen_at = NOW() WHERE user_id = $1 AND device_hash = $2',
      [userId, deviceHash]
    );
    return { isNewDevice: false };
  }

  await dbQuery(
    `INSERT INTO known_devices (user_id, device_hash)
     VALUES ($1, $2)
     ON CONFLICT (user_id, device_hash) DO UPDATE SET last_seen_at = NOW()`,
    [userId, deviceHash]
  );

  const uaShort = userAgent ? userAgent.slice(0, 200) : 'Unknown browser';
  await dbQuery(
    `INSERT INTO security_alerts (user_id, type, message, ip_address, user_agent)
     VALUES ($1, 'new_device_login', $2, $3, $4)`,
    [
      userId,
      `New sign-in from a device we haven't seen before. If this wasn't you, secure your account immediately.`,
      ipAddress || null,
      uaShort,
    ]
  );

  return { isNewDevice: true };
}

export async function getSecurityAlerts(userId: string, limit = 20): Promise<
  { id: string; type: string; message: string; ip_address: string | null; created_at: string }[]
> {
  const r = await dbQuery<{ id: string; type: string; message: string; ip_address: string | null; created_at: string }>(
    `SELECT id, type, message, ip_address, created_at
     FROM security_alerts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return r.rows;
}
