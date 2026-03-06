import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import {
  validateCredentials,
  generateTokens,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  signupUser,
} from './auth.service.js';
import { storeImapCredentials, deleteImapCredentials } from '../common/redis.js';
import { authMiddleware, type AuthRequest } from './auth.middleware.js';
import { createAuditLog } from '../admin/audit.service.js';

export const authRouter = Router();

authRouter.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('displayName').optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, displayName } = req.body;

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

    await createAuditLog({
      userId: result.user.id,
      action: 'login',
      resourceType: 'auth',
      metadata: { email: result.user.email },
      ipAddress: ip,
    });

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        display_name: result.user.display_name,
        role: result.user.role,
        twoFaEnabled: result.user.twoFaEnabled,
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

authRouter.post('/2fa/disable', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { disable2FA } = await import('./2fa.service.js');
  await disable2FA(req.user.id);
  res.json({ success: true });
});
