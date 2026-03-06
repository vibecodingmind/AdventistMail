import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { authMiddleware, type AuthRequest } from '../auth/auth.middleware.js';
import * as snoozeService from './snooze.service.js';

export const snoozeRouter = Router();
snoozeRouter.use(authMiddleware);

snoozeRouter.post(
  '/',
  [
    body('messageUid').isInt(),
    body('folder').notEmpty(),
    body('snoozeUntil').isISO8601(),
    body('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const snoozed = await snoozeService.snoozeMessage(
        req.user.id,
        req.body.messageUid,
        req.body.folder,
        new Date(req.body.snoozeUntil),
        req.body.mailbox
      );
      res.status(201).json(snoozed);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);

snoozeRouter.delete(
  '/',
  [
    body('messageUid').isInt(),
    body('folder').notEmpty(),
    body('mailbox').optional().isEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const ok = await snoozeService.unsnoozeMessage(
        req.user.id,
        req.body.messageUid,
        req.body.folder,
        req.body.mailbox
      );
      res.json({ success: ok });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
);
