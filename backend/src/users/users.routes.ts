import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole, type AuthRequest } from '../auth/auth.middleware.js';
import {
  createUser,
  resetUserPassword,
  disableUser,
  enableUser,
  assignUserRole,
  listUsers,
  verifyUser,
} from './users.service.js';
import { createAuditLog } from '../admin/audit.service.js';
import type { UserRole } from '../common/types.js';

export const usersRouter = Router();

usersRouter.use(authMiddleware);
usersRouter.use(requireRole('admin', 'super_admin'));

// List users
usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Create user
usersRouter.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('displayName').optional().isString(),
    body('role').optional().isIn(['user', 'admin', 'super_admin']),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, displayName, role } = req.body;

    try {
      const result = await createUser(email, password, displayName, (role as UserRole) || 'user');

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      await createAuditLog({
        userId: req.user!.id,
        action: 'user_created',
        resourceType: 'user',
        resourceId: result.user!.id,
        metadata: { email },
        ipAddress: req.ip,
      });

      res.status(201).json({ user: result.user });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Reset password
usersRouter.post(
  '/:id/reset-password',
  [param('id').isUUID(), body('password').isLength({ min: 8 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await resetUserPassword(req.params.id, req.body.password);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      await createAuditLog({
        userId: req.user!.id,
        action: 'password_reset',
        resourceType: 'user',
        resourceId: req.params.id,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Disable user
usersRouter.post('/:id/disable', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  try {
    const result = await disableUser(req.params.id);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    await createAuditLog({
      userId: req.user!.id,
      action: 'user_disabled',
      resourceType: 'user',
      resourceId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Verify user (for signup flow - admin approves new signups)
usersRouter.post('/:id/verify', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  try {
    const result = await verifyUser(req.params.id);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    await createAuditLog({
      userId: req.user!.id,
      action: 'user_verified',
      resourceType: 'user',
      resourceId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Enable user
usersRouter.post('/:id/enable', [param('id').isUUID()], async (req: AuthRequest, res: Response) => {
  try {
    const result = await enableUser(req.params.id);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    await createAuditLog({
      userId: req.user!.id,
      action: 'user_enabled',
      resourceType: 'user',
      resourceId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Assign role
usersRouter.post(
  '/:id/assign-role',
  [param('id').isUUID(), body('role').isIn(['user', 'admin', 'super_admin'])],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await assignUserRole(req.params.id, req.body.role as UserRole);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      await createAuditLog({
        userId: req.user!.id,
        action: 'role_assigned',
        resourceType: 'user',
        resourceId: req.params.id,
        metadata: { role: req.body.role },
        ipAddress: req.ip,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);
