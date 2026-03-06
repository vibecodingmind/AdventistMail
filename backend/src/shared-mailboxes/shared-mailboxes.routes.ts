import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole, type AuthRequest } from '../auth/auth.middleware.js';
import {
  getMailboxesForUser,
  ensureMailboxExists,
  grantMailboxAccess,
  updateMailboxAccess,
  revokeMailboxAccess,
  listSharedMailboxes,
} from './shared-mailboxes.service.js';

export const sharedMailboxesRouter = Router();

// Get mailboxes for current user (all users)
sharedMailboxesRouter.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const mailboxes = await getMailboxesForUser(req.user.id);
    res.json({ mailboxes });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// List shared mailboxes (admin only)
sharedMailboxesRouter.get('/shared', authMiddleware, requireRole('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const mailboxes = await listSharedMailboxes(req.user!.id);
    res.json({ mailboxes });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Grant access to mailbox (admin only)
sharedMailboxesRouter.post(
  '/:id/access',
  authMiddleware,
  requireRole('admin', 'super_admin'),
  [
    param('id').isUUID(),
    body('userId').isUUID(),
    body('can_read').optional().isBoolean(),
    body('can_send_as').optional().isBoolean(),
    body('can_reply_as').optional().isBoolean(),
    body('can_manage_folders').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = await grantMailboxAccess(req.params.id, req.body.userId, {
        can_read: req.body.can_read,
        can_send_as: req.body.can_send_as,
        can_reply_as: req.body.can_reply_as,
        can_manage_folders: req.body.can_manage_folders,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Update access (admin only)
sharedMailboxesRouter.patch(
  '/:id/access/:userId',
  authMiddleware,
  requireRole('admin', 'super_admin'),
  [
    param('id').isUUID(),
    param('userId').isUUID(),
    body('can_read').optional().isBoolean(),
    body('can_send_as').optional().isBoolean(),
    body('can_reply_as').optional().isBoolean(),
    body('can_manage_folders').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const result = await updateMailboxAccess(req.params.id, req.params.userId, {
        can_read: req.body.can_read,
        can_send_as: req.body.can_send_as,
        can_reply_as: req.body.can_reply_as,
        can_manage_folders: req.body.can_manage_folders,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Revoke access (admin only)
sharedMailboxesRouter.delete(
  '/:id/access/:userId',
  authMiddleware,
  requireRole('admin', 'super_admin'),
  [param('id').isUUID(), param('userId').isUUID()],
  async (req: Request, res: Response) => {
    try {
      const result = await revokeMailboxAccess(req.params.id, req.params.userId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

// Create shared mailbox (admin only)
sharedMailboxesRouter.post(
  '/',
  authMiddleware,
  requireRole('admin', 'super_admin'),
  [body('email').isEmail().normalizeEmail(), body('displayName').optional().isString()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const id = await ensureMailboxExists(req.body.email, 'shared');
      if (req.body.displayName) {
        const { query } = await import('../db/index.js');
        await query('UPDATE mailboxes SET display_name = $1 WHERE id = $2', [req.body.displayName, id]);
      }
      res.status(201).json({ id, email: req.body.email });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);
