import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  validateCredentials,
  generateTokens,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  signupUser,
  findOrCreateGoogleUser,
  requestPasswordReset,
  resetPassword,
  getSessionsForUser,
  revokeSessionById,
} from './auth.service.js';
import { storeImapCredentials, deleteImapCredentials } from '../common/redis.js';
import { authMiddleware, type AuthRequest } from './auth.middleware.js';
import { createAuditLog } from '../admin/audit.service.js';

export const authRouter = Router();

authRouter.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
    body('displayName').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, displayName } = req.body;

    const { validatePassword } = await import('./password-policy.js');
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      res.status(400).json({ error: pwCheck.message });
      return;
    }

    const result = await signupUser(email, password, displayName);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      message: 'Account created. An admin must verify your account before you can sign in.',
    });
  }
);

authRouter.post(
  '/signup/organization',
  [
    body('orgName').notEmpty().trim(),
    body('orgType').isIn(['church', 'ministries', 'institutions', 'unions']).withMessage('Invalid org type'),
    body('requestedEmail').isEmail().normalizeEmail(),
    body('ownerEmail').isEmail().normalizeEmail(),
    body('ownerPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('ownerDisplayName').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { createOrganization } = await import('../organizations/organizations.service.js');
    const result = await createOrganization(
      req.body.orgName,
      req.body.orgType,
      req.body.requestedEmail,
      req.body.ownerEmail,
      req.body.ownerPassword,
      req.body.ownerDisplayName
    );

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      message: 'Organization submitted. An admin will verify it. You can log in once approved.',
    });
  }
);

authRouter.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;

    const result = await validateCredentials(email, password);

    if (!result.success || !result.user) {
      if ('reason' in result && result.reason === 'pending_verification') {
        res.status(403).json({ error: 'Account pending verification. An admin must verify your account before you can sign in.' });
        return;
      }
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const { accessToken, refreshToken, expiresIn } = generateTokens(result.user);
    await storeRefreshToken(result.user.id, refreshToken);
    await storeImapCredentials(result.user.id, result.user.email, password);

    const { recordLoginSecurity } = await import('../security/security.service.js');
    const { isNewDevice } = await recordLoginSecurity(result.user.id, ip, req.get('User-Agent'));

    await createAuditLog({
      userId: result.user.id,
      action: 'login',
      resourceType: 'auth',
      metadata: { email: result.user.email, newDevice: isNewDevice },
      ipAddress: ip,
    });

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        display_name: result.user.display_name,
        role: result.user.role,
        twoFaEnabled: result.user.twoFaEnabled,
        newDeviceAlert: isNewDevice,
      },
      accessToken,
      refreshToken,
      expiresIn,
    });
  }
);

authRouter.post('/logout', authMiddleware, async (req: AuthRequest, res) => {
  const refreshToken = req.body.refreshToken;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  if (req.user?.id) {
    await deleteImapCredentials(req.user.id);
  }
  res.json({ success: true });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  const user = await verifyRefreshToken(refreshToken);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const { accessToken, refreshToken: newRefreshToken, expiresIn } = generateTokens(user);
  await revokeRefreshToken(refreshToken);
  await storeRefreshToken(user.id, newRefreshToken);

  res.json({
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn,
  });
});

authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({
    id: req.user.id,
    email: req.user.email,
    display_name: req.user.display_name,
    role: req.user.role,
  });
});

authRouter.get('/security-alerts', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { getSecurityAlerts } = await import('../security/security.service.js');
    const alerts = await getSecurityAlerts(req.user.id);
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

authRouter.get('/sessions', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const sessions = await getSessionsForUser(req.user.id);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

authRouter.delete('/sessions/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const ok = await revokeSessionById(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// 2FA
authRouter.post(
  '/2fa/enable',
  authMiddleware,
  async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { generate2FASecret } = await import('./2fa.service.js');
    const { secret, qrUrl } = await generate2FASecret(req.user.id, req.user.email);
    res.json({ secret, qrUrl });
  }
);

authRouter.post(
  '/2fa/verify',
  authMiddleware,
  async (req: AuthRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { secret, token } = req.body;
    if (!secret || !token) {
      res.status(400).json({ error: 'secret and token required' });
      return;
    }
    const { enable2FA } = await import('./2fa.service.js');
    const result = await enable2FA(req.user.id, secret, token);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  }
);

// Change password (authenticated user)
authRouter.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

    const { currentPassword, newPassword } = req.body;
    const { validatePassword } = await import('./password-policy.js');
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.message });
    }
    const { query: dbQuery } = await import('../db/index.js');
    const bcryptLib = await import('bcryptjs');

    const row = await dbQuery<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1', [req.user.id]
    );
    const hash = row.rows[0]?.password_hash;
    if (!hash || !(await bcryptLib.default.compare(currentPassword, hash))) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcryptLib.default.hash(newPassword, 12);
    await dbQuery('UPDATE users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);
    res.json({ success: true });
  }
);

// Google OAuth — accepts Google credential (id_token) from frontend
authRouter.post(
  '/google',
  [body('credential').notEmpty().withMessage('Google credential required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { credential, userInfo } = req.body;

    const result = await findOrCreateGoogleUser(credential, userInfo);

    if (!result.success || !result.user) {
      res.status(401).json({ error: result.error || 'Google authentication failed' });
      return;
    }

    const { accessToken, refreshToken, expiresIn } = generateTokens(result.user);
    await storeRefreshToken(result.user.id, refreshToken);

    const { recordLoginSecurity } = await import('../security/security.service.js');
    const { isNewDevice } = await recordLoginSecurity(result.user.id, req.ip, req.get('User-Agent'));

    await createAuditLog({
      userId: result.user.id,
      action: 'login',
      resourceType: 'auth',
      metadata: { email: result.user.email, provider: 'google', newDevice: isNewDevice },
      ipAddress: req.ip,
    });

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        display_name: result.user.display_name,
        role: result.user.role,
        is_verified: result.user.is_verified,
        newDeviceAlert: isNewDevice,
      },
      accessToken,
      refreshToken,
      expiresIn,
      is_new: result.is_new,
    });
  }
);

authRouter.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: 'Valid email required' });
      return;
    }
    await requestPasswordReset(req.body.email);
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  }
);

authRouter.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const { validatePassword } = await import('./password-policy.js');
    const pwCheck = validatePassword(req.body.password);
    if (!pwCheck.valid) {
      res.status(400).json({ error: pwCheck.message });
      return;
    }
    const result = await resetPassword(req.body.token, req.body.password);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ message: 'Password updated successfully.' });
  }
);

authRouter.post('/2fa/disable', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { disable2FA } = await import('./2fa.service.js');
  await disable2FA(req.user.id);
  res.json({ success: true });
});

// Data export (GDPR)
authRouter.post('/export-data', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { query: dbQuery } = await import('../db/index.js');
  try {
    const [userRow, sigsRow, templatesRow, auditRow] = await Promise.all([
      dbQuery('SELECT id, email, display_name, role, created_at, updated_at FROM users WHERE id = $1', [req.user.id]),
      dbQuery('SELECT name, content, is_default FROM user_signatures WHERE user_id = $1', [req.user.id]),
      dbQuery('SELECT name, subject, body_html, created_at FROM email_templates WHERE user_id = $1', [req.user.id]),
      dbQuery('SELECT action, resource_type, resource_id, metadata, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000', [req.user.id]),
    ]);
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userRow.rows[0] || null,
      signatures: sigsRow.rows,
      templates: templatesRow.rows,
      auditLogs: auditRow.rows,
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="adventist-mail-export.json"');
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
  }
});

// Account deletion (requires password)
authRouter.post(
  '/delete-account',
  authMiddleware,
  [body('password').notEmpty().withMessage('Password required for verification')],
  async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { query: dbQuery } = await import('../db/index.js');
    const bcryptLib = await import('bcryptjs');
    const row = await dbQuery<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const hash = row.rows[0]?.password_hash;
    if (!hash || !(await bcryptLib.default.compare(req.body.password, hash))) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    // Soft delete: set is_active = false, clear sensitive data
    await dbQuery(
      'UPDATE users SET is_active = false, password_hash = NULL, two_fa_secret = NULL, updated_at = NOW() WHERE id = $1',
      [req.user.id]
    );
    await deleteImapCredentials(req.user.id);
    await createAuditLog({ userId: req.user.id, action: 'account_deleted', resourceType: 'user', ipAddress: req.ip });
    res.json({ success: true, message: 'Account has been deactivated.' });
  }
);
